# Standard library imports
import os
import logging

# Third-party imports
from fastapi import FastAPI, Depends, HTTPException, Request, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from clerk_backend_api.sdk import Clerk
# Import specific exceptions from the Clerk SDK
from clerk_backend_api.errors import ClerkAPIError, ClerkSDKError
from typing import Annotated, Optional

# --- Configuration ---
# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Clerk Initialization (No arguments needed for Backend API v2)
clerk = Clerk()

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

# --- Authentication Dependency ---
async def get_authenticated_user_id(request: Request) -> str:
    """FastAPI dependency to verify Clerk token and return user ID."""
    try:
        logger.info("Attempting to authenticate request v2...")
        # Corrected call: Call authenticate_request_v2 directly on the clerk object
        claims = await clerk.authenticate_request_v2(request=request) 
        
        # Check if claims are valid (not None and contain 'sub')
        if claims and 'sub' in claims:
            user_id = claims['sub']
            logger.info(f"Authentication successful for user_id: {user_id}")
            return user_id
        else:
            logger.warning("Authentication returned invalid claims.")
            raise HTTPException(status_code=401, detail="Invalid authentication claims.")

    except ClerkAPIError as e:
        logger.error(f"Clerk API Error during authentication: {e}")
        raise HTTPException(status_code=401, detail=f"Clerk API Error: {e.errors}")
    except ClerkSDKError as e:
        logger.error(f"Clerk SDK Error during authentication: {e}")
        raise HTTPException(status_code=401, detail=f"Clerk SDK Error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during authentication: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unexpected error during authentication.")

AuthenticatedUserId = Annotated[str, Depends(get_authenticated_user_id)]

# --- Background Tasks ---
def track_summary_usage(user_id: str):
    """Placeholder for tracking summary usage (e.g., update Clerk metadata)."""
    logger.info(f"[Usage Tracking - Placeholder] Summary generated for user: {user_id}")
    # TODO: Implement actual usage tracking, e.g., using Clerk update_user_metadata
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
        # Add robust parsing and error handling here
        try:
            # Assuming the model directly outputs a JSON string or similar
            # This might need refinement based on actual Gemini output format
            # A simple approach: find the first { and last } 
            json_response_text = response.text
            start_index = json_response_text.find('{')
            end_index = json_response_text.rfind('}')
            if start_index != -1 and end_index != -1:
                json_str = json_response_text[start_index:end_index+1]
                # Use Pydantic to validate and parse
                summary_data = SummarizeResponse.model_validate_json(json_str) 
                logger.info("Successfully generated and parsed summary.")
            else:
                 raise ValueError("Could not find valid JSON object in response text.")
        except Exception as parse_error:
            logger.error(f"Failed to parse summary response from AI: {parse_error}\nRaw Response: {response.text}", exc_info=True)
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