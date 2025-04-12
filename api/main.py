import os
import httpx
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Annotated
import logging
import google.generativeai as genai
# --- Start Edit: Manual JWT Verification Imports ---
import jwt # Import PyJWT
from jwt import PyJWKClient # For fetching JWKS keys
# --- End Edit ---
from fastapi.responses import JSONResponse # Keep this
# --- Start Edit: Add Prisma Import ---
from prisma import Prisma, register
# --- End Edit ---

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

# --- Clerk JWKS Configuration (Manual Verification) ---
# Determine this from the 'iss' claim in your JWTs
CLERK_ISSUER = "https://actual-marmot-36.clerk.accounts.dev"
CLERK_JWKS_URL = f"{CLERK_ISSUER}/.well-known/jwks.json"

# JWK Client to fetch and cache Clerk's public keys
# Use verify_ssl=True in production (default)
# Add a User-Agent header as recommended practice
jwks_client = PyJWKClient(CLERK_JWKS_URL, headers={"User-Agent": "SnipSummaryAPI/1.0"})

# Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# --- Start Edit: Initialize Prisma --- 
prisma = Prisma()
register(prisma) # Register for global access if needed, or pass instance
# --- End Edit ---

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

# --- Authentication Dependency (Manual JWT Verification) --- 
async def get_authenticated_user_id(request: Request) -> str:
    """Dependency to authenticate the request using manual JWT verification."""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("Auth failed: Missing/malformed Bearer token")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or malformed Bearer token")
        
        token = auth_header.split(' ')[1]

        # --- Start Edit: Manual JWT Verification Steps --- 
        try:
            # Get the signing key from JWKS using the kid from the token header
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            # Decode and validate the token
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"], # Algorithm used by Clerk
                issuer=CLERK_ISSUER, # Verify the issuer matches your Clerk instance
                # audience= # Optional: Add audience verification if needed (e.g., your API endpoint)
            )

            # Extract user ID from the 'sub' claim
            user_id = claims.get('sub')

        except jwt.exceptions.PyJWKClientError as e:
            logger.error(f"Auth failed: Error fetching/finding JWKS key - {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error retrieving signing key")
        except jwt.exceptions.ExpiredSignatureError:
            logger.warning("Auth failed: Token has expired")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        except jwt.exceptions.InvalidIssuerError:
            logger.warning("Auth failed: Invalid token issuer")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token issuer")
        except jwt.exceptions.InvalidAudienceError:
            logger.warning("Auth failed: Invalid token audience")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token audience")
        except jwt.exceptions.InvalidSignatureError:
             logger.warning("Auth failed: Token signature is invalid")
             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
        except jwt.exceptions.DecodeError as e:
            logger.warning(f"Auth failed: Token decoding error - {e}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token decode error: {e}")
        except Exception as e: # Catch other potential errors during decode/validation
            logger.exception(f"Auth failed: Unexpected error during JWT validation - {e}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unexpected token validation error")
        # --- End Edit ---

        if not user_id:
            # This should technically not happen if decode succeeds and 'sub' is always present
            logger.error("Auth successful (token verified) but 'sub' claim missing.")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID ('sub' claim) not found in verified token")

        logger.info(f"Authenticated user: {user_id}")
        return user_id

    except HTTPException as e:
        # Re-raise HTTPExceptions raised within the try block
        raise e
    except Exception as e:
        # Catch errors outside the JWT validation block (e.g., header parsing)
        logger.exception("Unexpected Authentication Error (Outer Scope)")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error during authentication setup")

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

# --- Start Edit: Add Prisma connect/disconnect events --- 
@app.on_event("startup")
async def startup():
    logger.info("Connecting to database...")
    await prisma.connect()
    logger.info("Database connection established.")

@app.on_event("shutdown")
async def shutdown():
    logger.info("Disconnecting from database...")
    await prisma.disconnect()
    logger.info("Database connection closed.")
# --- End Edit ---

# --- Health Check Endpoint (Does not require authentication) ---
@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    # Add a basic DB check if desired
    try:
        await prisma.user.count() # Simple query to check DB connection
        db_status = "ok"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "error"
    return {"status": "ok", "database": db_status}

# Generic Exception Handler (Good Practice)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception for request {request.method} {request.url}") # Log traceback
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected internal server error occurred."},
    )

# --- Run the server (for local development) ---
if __name__ == "__main__":
    import uvicorn
    # Correctly check for environment variable and only then run uvicorn
    # This prevents running locally by default when imported elsewhere or in production
    if os.environ.get("RUN_LOCALLY") == "true":
        logger.info("Starting server locally with reload enabled...")
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    else:
        logger.info("Not running locally, set RUN_LOCALLY=true to start development server.") 