import os
import httpx
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Annotated

# --- Clerk Backend API SDK Imports (Corrected based on docs) --- 
# from clerk_backend_api import Clerk # We might not need the main Clerk client for just auth
from clerk_backend_api.jwks_helpers import authenticate_request, AuthenticateRequestOptions
from clerk_backend_api.models import ClerkAPIError # Keep error model
# ---------------------------------------------------------------

# Load environment variables from .env file
load_dotenv()

# Load Clerk Secret Key
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
if not CLERK_SECRET_KEY:
    print("Error: CLERK_SECRET_KEY environment variable not set.")
    raise ValueError("CLERK_SECRET_KEY environment variable is required for authentication.")

# --- Remove Clerk SDK Instance (Not needed for jwks_helpers.authenticate_request) ---
# clerk_sdk = Clerk(bearer_auth=CLERK_SECRET_KEY)
# ---------------------------------------------------------------------------------

# Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# --- FastAPI App Setup ---
app = FastAPI(
    title="Tildra API",
    description="Provides summarization services for the Tildra extension and dashboard.",
    version="1.1.0"
)

# --- Define Frontend URL (for authorized parties) --- 
# Ensure this matches your frontend URL exactly
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.tildra.xyz")

# Configure CORS
origins = [
    # Replace YOUR_EXTENSION_ID_HERE with the actual ID from chrome://extensions
    "chrome-extension://hcibldlopaogbnnfiofgkcgccfhifede", # Set user's actual extension ID
    # os.getenv("EXTENSION_ORIGIN", "chrome-extension://*"), # Use env var or default - Replaced with specific ID
    "http://localhost:3000",
    FRONTEND_URL,
    "null"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"], # Includes Authorization
)

# --- Authentication Dependency using jwks_helpers.authenticate_request --- 
async def get_authenticated_user_id(request: Request) -> str:
    """FastAPI dependency to authenticate request using Clerk SDK (jwks_helpers) and return user ID."""
    try:
        # The authenticate_request function likely needs specific parts of the request,
        # primarily headers (for Bearer token) and possibly cookies.
        # We pass the whole FastAPI request object; the SDK function should extract what it needs.
        options = AuthenticateRequestOptions(
            secret_key=CLERK_SECRET_KEY, # Use secret key for verification
            # Add your frontend URL to authorized parties for audience validation
            # authorized_parties=[FRONTEND_URL]
        )
        
        # Note: The SDK function might be synchronous or async. 
        # Assuming it's synchronous based on the example, but might need 'await' if it's async.
        # Let's wrap in await just in case, as FastAPI supports both in Depends.
        request_state = await authenticate_request(request, options) 
        # If sync: request_state = authenticate_request(request, options)

        if not request_state or not request_state.is_signed_in:
            # Use the reason provided by the SDK if available
            reason = request_state.reason if request_state else "Unknown"
            raise HTTPException(status_code=401, detail=f"User is not signed in. Reason: {reason}")

        if not request_state.claims or not request_state.claims.sub:
             raise HTTPException(status_code=401, detail="User ID (sub) not found in token claims")

        # Successfully authenticated, return the user ID (subject claim)
        print(f"Authenticated user: {request_state.claims.sub}")
        return request_state.claims.sub

    except ClerkAPIError as e:
        print(f"Clerk Authentication Error: {e}")
        raise HTTPException(status_code=401, detail=f"Clerk Auth Error: {e.errors}")
    except HTTPException as e:
        # Re-raise HTTPExceptions raised within the try block
        raise e
    except Exception as e:
        print(f"Unexpected Authentication Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during authentication")

AuthenticatedUser = Annotated[str, Depends(get_authenticated_user_id)]
# --------------------------------------------------------------------

# --- Pydantic Models ---
class SummarizeRequest(BaseModel):
    article_text: str

class SummarizeResponse(BaseModel):
    tldr: str
    key_points: list[str]

# --- API Endpoints ---
@app.post("/summarize", response_model=SummarizeResponse)
async def summarize_article(
    request: SummarizeRequest,
    user_id: AuthenticatedUser # Dependency verifies token and provides user_id
):
    """
    Accepts article text and returns a TL;DR summary and key points
    generated by the DeepSeek API. Requires valid Clerk Authentication.
    """
    print(f"User {user_id} requested summarization.")

    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="DeepSeek API key not configured on server.")

    if not request.article_text or not request.article_text.strip():
        raise HTTPException(status_code=400, detail="article_text cannot be empty.")

    # --- DeepSeek API Call ---
    try:
        prompt = f"""Summarize the following article in 3–5 sentences. Then, list 3 key points explaining why this article matters as a JSON object with keys 'tldr' and 'key_points' (a list of strings).

Article Text:
{request.article_text[:15000]} # Limit input text size for safety/cost

Respond ONLY with the JSON object.""" # Ensure only JSON is returned

        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "deepseek-chat", # Use the appropriate DeepSeek model name
            "messages": [
                {"role": "system", "content": "You are an expert summarizer. Respond only with the requested JSON object."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "response_format": { "type": "json_object" } # Request JSON output
        }

        async with httpx.AsyncClient(timeout=60.0) as client: # Increased timeout for potentially long summaries
            response = await client.post(DEEPSEEK_API_URL, headers=headers, json=payload)
            response.raise_for_status() # Raise exception for bad status codes (4xx or 5xx)

            api_response = response.json()

            # --- Process DeepSeek Response ---
            # Extract the JSON content from the response
            # Adjust based on the actual structure of the DeepSeek API response
            if not api_response.get('choices') or not api_response['choices'][0].get('message') or not api_response['choices'][0]['message'].get('content'):
                 raise HTTPException(status_code=500, detail="Invalid response structure from DeepSeek API.")

            summary_content_str = api_response['choices'][0]['message']['content']

            # Attempt to parse the JSON string within the content
            try:
                import json
                summary_data = json.loads(summary_content_str)
                if 'tldr' not in summary_data or 'key_points' not in summary_data:
                     raise ValueError("Missing 'tldr' or 'key_points' in DeepSeek response JSON.")
                if not isinstance(summary_data['key_points'], list):
                     raise ValueError("'key_points' must be a list in DeepSeek response JSON.")

                # Validate list items are strings
                if not all(isinstance(item, str) for item in summary_data['key_points']):
                     raise ValueError("All items in 'key_points' must be strings.")

            except (json.JSONDecodeError, ValueError) as json_err:
                print(f"Error parsing DeepSeek JSON response: {json_err}")
                print(f"Raw response content: {summary_content_str}")
                raise HTTPException(status_code=500, detail=f"Could not parse summary JSON from DeepSeek: {json_err}")


            # Return the structured response
            return SummarizeResponse(
                tldr=summary_data['tldr'],
                key_points=summary_data['key_points']
            )

    except httpx.RequestError as exc:
        print(f"An error occurred while requesting {exc.request.url!r}: {exc}")
        raise HTTPException(status_code=503, detail=f"Could not connect to DeepSeek API: {exc}")
    except httpx.HTTPStatusError as exc:
        print(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}: {exc.response.text}")
        raise HTTPException(status_code=exc.response.status_code, detail=f"DeepSeek API returned an error: {exc.response.text}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")


# --- Health Check Endpoint (Does not require authentication) ---
@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Run Instruction (for local development) ---
if __name__ == "__main__":
    import uvicorn
    print("Starting Tildra API server on http://localhost:8000")
    print("Ensure DEEPSEEK_API_KEY and CLERK_SECRET_KEY are set in your .env file.")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 