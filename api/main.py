import os
import httpx
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Annotated
import logging
import google.generativeai as genai
from clerk_backend_api import Clerk
from clerk_backend_api import models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Load Clerk Secret Key
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
if not CLERK_SECRET_KEY:
    logger.critical("CLERK_SECRET_KEY environment variable not set")
    raise ValueError("CLERK_SECRET_KEY environment variable is required for authentication.")

clerk = Clerk(bearer_auth=CLERK_SECRET_KEY)

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

# --- Authentication Dependency using Clerk SDK v2.x --- 
async def get_authenticated_user_id(request: Request) -> str:
    """Dependency to authenticate the request using Clerk SDK v2.x."""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("Authentication failed: Missing or malformed Bearer token")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or malformed Bearer token")
        
        token = auth_header.split(' ')[1]

        # Verify the token using the clients submodule and verify method (matching README example)
        verify_response = clerk.clients.verify(request={"token": token})
        
        # Extract user ID - Still speculative based on potential response structure
        user_id = None
        if hasattr(verify_response, 'session') and verify_response.session and hasattr(verify_response.session, 'user_id'):
             user_id = verify_response.session.user_id
        # Fallback or alternative: Check if claims/subject are directly available (less likely for verify_client)
        # elif hasattr(verify_response, 'subject'):
        #     user_id = verify_response.subject
        # elif hasattr(verify_response, 'claims') and verify_response.claims:
        #     user_id = verify_response.claims.get('sub')

        if not user_id:
            logger.error("Authentication successful (token verified) but could not extract User ID from response.")
            # logger.debug(f"Clerk verify response structure: {verify_response}") # Keep this commented for now
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not extract User ID after token verification")

        logger.info(f"Authenticated user: {user_id}")
        return user_id

    except models.ClerkErrors as e:
        # Log the specific Clerk error data if available
        error_detail = str(e) 
        if hasattr(e, 'data') and e.data is not None and hasattr(e.data, 'errors') and e.data.errors:
            # Assuming e.data.errors is a list of error objects
            try:
                first_error = e.data.errors[0]
                error_detail = f"{first_error.message} (Code: {first_error.code}, Meta: {first_error.meta})"
            except (IndexError, AttributeError):
                 pass # Fallback to default string representation

        logger.warning(f"Clerk Authentication Error: {error_detail}")
        # Determine status code based on error (e.g., 401 for bad token, 400 for bad request)
        # For simplicity, using 401 for auth-related Clerk errors
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication Error: {error_detail}")
    except models.SDKError as e:
        # Catch broader SDK errors (like network issues talking to Clerk API)
        logger.error(f"Clerk SDK Error during authentication: {e.message} (Status: {e.status_code})")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Clerk SDK error: {e.message}")
    except Exception as e:
        logger.exception("Unexpected Authentication Error") # Log full traceback for unexpected errors
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error during authentication")

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
    logger.info(f"User {user_id} requested summarization.")

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

# Generic Exception Handler (Good Practice)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception for request {request.method} {request.url}") # Log traceback
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected internal server error occurred."},
    )

# --- Run Instruction (for local development) ---
if __name__ == "__main__":
    import uvicorn
    print("Starting Tildra API server on http://localhost:8000")
    print("Ensure DEEPSEEK_API_KEY and CLERK_SECRET_KEY are set in your .env file.")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 