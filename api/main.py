# Standard library imports
import os
import logging
import json # For parsing DeepSeek response
from datetime import datetime, timezone, timedelta # For usage reset logic

# Third-party imports
from fastapi import FastAPI, Depends, HTTPException, Request, Header, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx # Use httpx for async API calls
# --- Removed google.generativeai import ---
# --- Start Edit: Manual JWT Verification Imports ---
import jwt # Import PyJWT
from jwt import PyJWKClient # For fetching JWKS keys
# --- End Edit ---
from typing import Annotated, Optional

# --- Prisma Client Import ---
from prisma import Prisma
# --------------------------

# --- Configuration ---
# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# --- Prisma Initialization ---
# Instantiate Prisma Client outside endpoint functions for reuse
prisma = Prisma()

# --- App Lifecycle for Prisma Connection ---
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
# -----------------------------------------

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

# Configure DeepSeek API
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not DEEPSEEK_API_KEY:
    logger.error("DEEPSEEK_API_KEY environment variable not set.")
    # Application will fail later if key is missing
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"


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
async def track_summary_usage(user_clerk_id: str):
    """Increments the summary usage count for the user in the database."""
    try:
        logger.info(f"[Usage Tracking] Attempting to increment usage for Clerk ID: {user_clerk_id}")
        updated_user = await prisma.user.update(
            where={"clerkId": user_clerk_id},
            data={"summariesUsed": {"increment": 1}}
        )
        if updated_user:
             logger.info(f"[Usage Tracking] Successfully incremented usage for Clerk ID: {user_clerk_id}. New count: {updated_user.summariesUsed}")
        else:
             # This case should be rare if user exists from check in main endpoint
             logger.error(f"[Usage Tracking] Failed to increment usage: User not found for Clerk ID: {user_clerk_id}")
    except Exception as e:
        # Log error but don't crash the main request
        logger.error(f"[Usage Tracking] Error incrementing usage count for Clerk ID {user_clerk_id}: {e}", exc_info=True)

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "SnipSummary API is running!"}

@app.post("/summarize", response_model=SummarizeResponse)
async def summarize_article(
    request_data: SummarizeRequest,
    user_clerk_id: AuthenticatedUserId, # Renamed for clarity (this is Clerk ID)
    background_tasks: BackgroundTasks
):
    """Receives article text, generates summary and key points using DeepSeek API."""
    logger.info(f"Received summarize request for Clerk ID: {user_clerk_id}")

    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="API key for summarization service (DeepSeek) not configured.")

    # --- Usage Limit Check ---
    user = None # Initialize user variable
    try:
        logger.debug(f"Checking database for Clerk ID: {user_clerk_id}")
        user = await prisma.user.find_unique(where={"clerkId": user_clerk_id})

        # Perform checks requiring the user object *after* confirming it exists.
        if user:
            # Check for daily reset ONLY if the user was found successfully
            now = datetime.now(timezone.utc)
            # Calculate the start of the current day (midnight) in UTC
            start_of_current_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

            if user.usageResetAt < start_of_current_day:
                logger.info(f"Usage period expired for Clerk ID: {user_clerk_id}. Resetting daily count.")
                # Use a specific update call, handle potential errors if user disappears mid-request
                updated_user_result = await prisma.user.update(
                    where={"clerkId": user_clerk_id},
                    data={
                        "summariesUsed": 0,
                        "usageResetAt": now
                    }
                )
                if not updated_user_result:
                     logger.error(f"Failed to reset usage for Clerk ID: {user_clerk_id}. User disappeared during update?")
                     raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user usage data.")
                # Update the local 'user' variable with the reset data for the subsequent check
                user = updated_user_result

    # Separate exception handling specifically for database operations
    except Exception as db_error:
        logger.error(f"Database error during user lookup/reset for Clerk ID {user_clerk_id}: {db_error}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error during usage check.")

    # --- Post-DB Check Validations ---
    # 1. Check if user was found
    if not user:
        logger.error(f"API logic error or race condition: User not found after DB check for Clerk ID: {user_clerk_id}")
        # Return 403 if user object is still None after the DB check block
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User profile not found.")

    # 2. Check usage limit
    # --- Bypass limit for Admin/Dev (Keep this logic if implemented) ---
    # if hasattr(user, 'isAdminOrDev') and user.isAdminOrDev:
    #     logger.info(f"Admin/Dev user detected ({user_clerk_id}), bypassing usage limits.")
    # else:
    # --- Check actual limit ---
    if user.summariesUsed >= user.summaryLimit:
        logger.warning(f"Usage limit reached for Clerk ID: {user_clerk_id}. Plan: {user.plan}, Used: {user.summariesUsed}, Limit: {user.summaryLimit}")
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Monthly summary limit ({user.summaryLimit}) reached for your '{user.plan}' plan.")
    else:
        logger.info(f"Usage within limits for Clerk ID: {user_clerk_id}. Plan: {user.plan}, Used: {user.summariesUsed}, Limit: {user.summaryLimit}")
    # --- End Usage Limit Check ---

    # --- Proceed with Summarization ---
    try:
        prompt_messages = [
            {
                "role": "system",
                "content": "You are an expert summarizer. Summarize the provided article text. Respond ONLY with a JSON object containing two keys: 'tldr' (a 1-2 sentence summary) and 'key_points' (a list of 3-5 string bullet points). Example: {\"tldr\": \"Short summary...\", \"key_points\": [\"Point 1...\", \"Point 2...\"]}"
            },
            {
                "role": "user",
                "content": f"Article Text:\n{request_data.article_text}"
            }
        ]

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }

        payload = {
            "model": "deepseek-chat", # Or deepseek-coder if more appropriate, check DeepSeek docs
            "messages": prompt_messages,
            "temperature": 0.7, # Adjust creativity
            "max_tokens": 500,  # Limit response length
            "stream": False # We want the full response at once
        }

        logger.info("Sending request to DeepSeek AI for summarization...")
        async with httpx.AsyncClient(timeout=60.0) as client: # Increased timeout
            response = await client.post(DEEPSEEK_API_URL, headers=headers, json=payload)

        # Handle potential errors from DeepSeek API
        if response.status_code != 200:
            error_content = response.text
            try:
                error_json = response.json()
                error_content = json.dumps(error_json)
            except json.JSONDecodeError:
                pass # Keep the raw text if it's not JSON
            logger.error(f"DeepSeek API error: Status {response.status_code}, Response: {error_content}")
            raise HTTPException(status_code=response.status_code, detail=f"DeepSeek API Error: {error_content}")

        # Extract and parse the JSON response from DeepSeek's message content
        try:
            deepseek_response_data = response.json()
            message_content = deepseek_response_data.get("choices", [{}])[0].get("message", {}).get("content", "")

            # Find JSON boundaries (similar to Gemini approach, needed if extra text exists)
            start_index = message_content.find('{')
            end_index = message_content.rfind('}')
            if start_index != -1 and end_index != -1:
                json_str = message_content[start_index:end_index+1]
            else:
                json_str = message_content # Assume content IS the JSON if boundaries not found

            # Use Pydantic to validate and parse the extracted JSON string
            summary_data = SummarizeResponse.model_validate_json(json_str)
            logger.info("Successfully generated and parsed summary from DeepSeek.")

        except (json.JSONDecodeError, IndexError, KeyError, Exception) as parse_error:
            logger.error(f"Failed to parse summary response from DeepSeek AI: {parse_error}\nRaw Response Content: {message_content if 'message_content' in locals() else 'N/A'}\nFull Response: {deepseek_response_data if 'deepseek_response_data' in locals() else response.text}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to parse summary response from AI.")

        # Add usage tracking as a background task
        background_tasks.add_task(track_summary_usage, user_clerk_id)

        return summary_data

    except httpx.RequestError as e:
        logger.error(f"Error sending request to DeepSeek: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Could not connect to summarization service: {e}")
    except Exception as e:
        logger.error(f"Error during summarization (DeepSeek) for user {user_clerk_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate summary: {e}")

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Optional: Add exception handlers if needed ---
# Example generic handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception for request {request.url}: {exc}")
    from fastapi.responses import JSONResponse # Local import for handler
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
