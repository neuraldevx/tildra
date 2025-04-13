# Standard library imports
import os
import logging

# Third-party imports
from fastapi import FastAPI, Depends, HTTPException, Request, Header, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
# Keep Clerk SDK import if needed elsewhere, but not for core auth here
# from clerk_backend_api.sdk import Clerk
# --- Start Edit: Manual JWT Verification Imports ---
import jwt # Import PyJWT
from jwt import PyJWKClient # For fetching JWKS keys
# --- End Edit ---
from typing import Annotated, Optional

# --- Configuration ---
# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# --- Clerk JWKS Configuration (Manual Verification) ---
# Determine this from the 'iss' claim in your JWTs
# Ensure this matches your Clerk instance's issuer URL
CLERK_ISSUER = os.getenv("CLERK_ISSUER_URL", "https://actual-marmot-36.clerk.accounts.dev") # Use env var, fallback
if not CLERK_ISSUER.startswith("https://"): # Basic validation
    logger.critical("CLERK_ISSUER_URL environment variable must be a valid HTTPS URL.")
    raise ValueError("Invalid CLERK_ISSUER_URL")
CLERK_JWKS_URL = f"{CLERK_ISSUER}/.well-known/jwks.json"

# JWK Client to fetch and cache Clerk's public keys
# Use verify_ssl=True in production (default)
# Add a User-Agent header as recommended practice
jwks_client = PyJWKClient(CLERK_JWKS_URL, headers={"User-Agent": "SnipSummaryAPI/1.0"})

# Configure CORS
# Adjust origins as needed for your frontend
origins = [
    "chrome-extension://jjcdkjjdonfmpenonghicgejhlojldmh", # Your extension's ID
    # "http://localhost:3000", # Example for local development
    # "https://your-frontend-domain.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Google Generative AI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY environment variable not set.")
    # Decide if you want to exit or handle this case differently
    # For now, we'll let it fail later if used without a key.
genai.configure(api_key=GOOGLE_API_KEY)


# --- Models ---
class SummarizeRequest(BaseModel):
    article_text: str

class SummarizeResponse(BaseModel):
    tldr: str
    key_points: list[str]

# --- Authentication Dependency (Manual JWT Verification) --- 
async def get_authenticated_user_id(request: Request) -> str:
    """Dependency to authenticate the request using manual JWT verification."""
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
            # options={"verify_exp": True} # Default, ensures token isn't expired
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
        logger.warning(f"Auth failed: Invalid token issuer. Expected: {CLERK_ISSUER}, Got: {jwt.get_unverified_header(token).get('iss', 'N/A')}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token issuer")
    # except jwt.exceptions.InvalidAudienceError:
    #     logger.warning("Auth failed: Invalid token audience")
    #     raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token audience")
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
        # If verification succeeded but no user_id in claims (shouldn't happen with valid Clerk tokens)
        logger.error("Auth successful (token verified) but 'sub' claim missing.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID ('sub' claim) not found in verified token")

    logger.info(f"Authenticated user: {user_id}")
    return user_id

AuthenticatedUserId = Annotated[str, Depends(get_authenticated_user_id)]

# --- Background Tasks ---
def track_summary_usage(user_id: str):
    """Placeholder for tracking summary usage (e.g., update Clerk metadata)."""
    logger.info(f"[Usage Tracking - Placeholder] Summary generated for user: {user_id}")
    # TODO: Implement actual usage tracking, e.g., using Clerk update_user_metadata or Prisma update
    pass

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "SnipSummary API is running!"}

@app.post("/summarize", response_model=SummarizeResponse)
async def summarize_article(
    request_data: SummarizeRequest,
    user_id: AuthenticatedUserId, # Injects the validated user ID
    background_tasks: BackgroundTasks
):
    """Receives article text, generates summary and key points using Google AI."""
    logger.info(f"Received summarize request for user: {user_id}")

    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="API key for summarization service not configured.")

    try:
        model = genai.GenerativeModel('gemini-1.5-flash') # Use a suitable model
        prompt = f"Summarize the following article text. Provide a concise TLDR (1-2 sentences) and a list of 3-5 key bullet points.\n\nArticle Text:\n{request_data.article_text}\n\nOutput format should be JSON with keys 'tldr' and 'key_points' (a list of strings). Example:\n{{\"tldr\": \"Short summary...\", \"key_points\": [\"Point 1...\", \"Point 2...\"]}}"
        
        logger.info("Sending request to Google AI for summarization...")
        response = await model.generate_content_async(prompt)
        
        # Attempt to parse the JSON response from the model
        try:
            json_response_text = response.text
            start_index = json_response_text.find('{')
            end_index = json_response_text.rfind('}')
            if start_index != -1 and end_index != -1:
                json_str = json_response_text[start_index:end_index+1]
                # Use Pydantic to validate and parse
                summary_data = SummarizeResponse.model_validate_json(json_str) 
                logger.info("Successfully generated and parsed summary.")
            else:
                 # Log the raw response if JSON boundaries aren't found
                 logger.warning(f"Could not find JSON object in response text. Raw text: {json_response_text}")
                 raise ValueError("Could not find valid JSON object in response text.")
        except Exception as parse_error:
            logger.error(f"Failed to parse summary response from AI: {parse_error}\nRaw Response: {getattr(response, 'text', 'N/A')}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to parse summary response from AI.")

        # Add usage tracking as a background task
        background_tasks.add_task(track_summary_usage, user_id)

        return summary_data

    except Exception as e:
        logger.error(f"Error during summarization for user {user_id}: {e}", exc_info=True)
        # Check for specific Google AI errors if possible
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {e}")

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Optional: Add exception handlers if needed ---
# Example generic handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception for request {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected internal server error occurred."},
    )

# --- Run Instruction (for local development) ---
if __name__ == "__main__":
    # Correctly check for environment variable and only then run uvicorn
    # This prevents running locally by default when imported elsewhere or in production
    if os.environ.get("RUN_LOCALLY") == "true":
        import uvicorn
        logger.info("Starting server locally with reload enabled on http://127.0.0.1:8000 ...")
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    # else:
        # logger.info("Not running locally, set RUN_LOCALLY=true to start development server.") 