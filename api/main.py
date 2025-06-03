# Standard library imports
#
import os
import logging
import json # For parsing DeepSeek response
from datetime import datetime, timezone, timedelta # For usage reset logic
import stripe
import time

# Third-party imports
from fastapi import FastAPI, Depends, HTTPException, Request, Header, BackgroundTasks, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field # Add Field
import httpx # Use httpx for async API calls
# --- Removed google.generativeai import ---
# --- Start Edit: Manual JWT Verification Imports ---
import jwt # Import PyJWT
from jwt import PyJWKClient # For fetching JWKS keys
# --- End Edit ---
from typing import Annotated, Optional, Dict, Any, List # Add Any and List
from dotenv import load_dotenv

# --- Prisma Client Import ---
from prisma import Prisma
# --- ADD Webhook Verification Import ---
from svix.webhooks import Webhook, WebhookVerificationError # Corrected import
from prisma.errors import UniqueViolationError # Import DB constraint exception for webhook handler
# --- END ADD ---
# --------------------------

# --- ADD Brevo Configuration ---
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
SENDER_EMAIL = "support@tildra.xyz"
SENDER_NAME = "Tildra Team"
# --- END ADD ---

# --- Explicitly load .env from project root ---
# Assuming this main.py is in an 'api' subdirectory of the project root
project_root_directory = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_project_path = os.path.join(project_root_directory, '.env')

# Get Python's root logger
logger_root = logging.getLogger() # Get the root logger
# Basic Config if not already configured (e.g. by uvicorn)
if not logger_root.hasHandlers():
    logging.basicConfig(level=logging.INFO)

if os.path.exists(dotenv_project_path):
    logger_root.info(f"Attempting to load .env file from: {dotenv_project_path}")
    load_dotenv(dotenv_path=dotenv_project_path, override=True) # Override to ensure it takes precedence
else:
    logger_root.warning(f".env file not found at: {dotenv_project_path}. Relying on system environment variables.")
# --- END Explicit Load ---

# --- Configuration ---
# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Validate BREVO_API_KEY at startup
if not BREVO_API_KEY:
    logger.warning("BREVO_API_KEY environment variable not set. Email sending will fail.")
else:
    logger.info("BREVO_API_KEY configured successfully.")

# Initialize FastAPI app
app = FastAPI()

# --- Prisma Initialization ---
# Instantiate Prisma Client outside endpoint functions for reuse
prisma = Prisma()

# --- ADDED: Debug print for DATABASE_URL ---
logger.info(f"DATABASE_URL at Prisma init: {os.getenv('DATABASE_URL')}")
# --- END ADDED ---

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
CLERK_ISSUER = os.getenv("CLERK_ISSUER_URL", "https://clerk.tildra.xyz") # CHANGED: Use production Clerk domain
if not CLERK_ISSUER.startswith("https://"): # Basic validation
    logger.critical("CLERK_ISSUER_URL environment variable must be a valid HTTPS URL.")
    raise ValueError("Invalid CLERK_ISSUER_URL")
CLERK_JWKS_URL = f"{CLERK_ISSUER}/.well-known/jwks.json"

# JWK Client to fetch and cache Clerk's public keys
# Use verify_ssl=True in production (default)
# Add a User-Agent header as recommended practice
jwks_client = PyJWKClient(CLERK_JWKS_URL, headers={"User-Agent": "TildraAPI/1.0"})

# --- Moved Block: Stripe Configuration --- 
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
PREMIUM_PRICE_ID_MONTHLY = os.getenv("PREMIUM_PRICE_ID_MONTHLY")
PREMIUM_PRICE_ID_YEARLY = os.getenv("PREMIUM_PRICE_ID_YEARLY")
# Get your frontend URL for success/cancel redirects
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.tildra.xyz") # CHANGED: Use production URL instead of localhost
SUCCESS_URL = f"{FRONTEND_URL}/payment/success" # Define SUCCESS_URL
CANCEL_URL = f"{FRONTEND_URL}/payment/cancel"   # Define CANCEL_URL
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET") # <-- Load webhook secret

if not STRIPE_SECRET_KEY:
    logger.error("STRIPE_SECRET_KEY environment variable not set.")
# Check needed Price IDs before assigning api_key
if not PREMIUM_PRICE_ID_MONTHLY or not PREMIUM_PRICE_ID_YEARLY:
    logger.error("Stripe Price IDs (Monthly/Yearly) environment variables not set.")

# Only assign api_key if the secret key exists
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
# ---------------------------------------

# --- Moved Block: DeepSeek Configuration --- # Also move this config up
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not DEEPSEEK_API_KEY:
    logger.error("DEEPSEEK_API_KEY environment variable not set.")
    # Application will fail later if key is missing
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
# -----------------------------------------

# --- ADD Clerk Webhook Secret --- 
CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SIGNING_SECRET")
if not CLERK_WEBHOOK_SECRET:
    # Log a warning but don't crash the app, as other endpoints might still work
    logger.warning("CLERK_WEBHOOK_SIGNING_SECRET environment variable not set. Webhook verification will fail.")
# --- END ADD ---

# Configure CORS (Now FRONTEND_URL is defined)
# Define allowed origins
origins = [
    "chrome-extension://jjcdkjjdonfmpenonghicgejhlojldmh", # Your extension's ID
    "https://www.tildra.xyz",                               # Production frontend
]
# Add the deployed frontend URL if it exists and is different from default
if FRONTEND_URL and FRONTEND_URL != "https://www.tildra.xyz":
    origins.append(FRONTEND_URL)

logger.info(f"Configuring CORS for origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Use the dynamic list
    allow_credentials=True,
    allow_methods=["*"],    # Allows GET, POST, OPTIONS etc.
    allow_headers=["*"],    # Allows Content-Type, Authorization etc.
)

# --- Models ---
class SummarizeRequest(BaseModel):
    article_text: str
    url: Optional[str] = None
    title: Optional[str] = None
    summary_length: Optional[str] = Field(default="standard", alias="summaryLength")

class SummarizeResponse(BaseModel):
    tldr: str
    key_points: list[str]

# Add model for checkout request
class CreateCheckoutRequest(BaseModel):
    price_lookup_key: str # e.g., 'monthly' or 'yearly'

# Add model for checkout response
class CreateCheckoutResponse(BaseModel):
    sessionId: str
    url: str

# --- ADDED: Model for User Account Details ---
class UserAccountDetailsResponse(BaseModel):
    email: Optional[str] = None
    plan: str
    summariesUsed: int
    summaryLimit: int
    is_pro: bool
# --- END ADDED ---

# --- ADDED: Model for User Status Endpoint --- 
class UserStatusResponse(BaseModel):
    is_pro: bool
# --- END ADDED ---

# --- ADDED: History Endpoint --- 
from typing import List # Add List import

# Define response model based on Prisma model (adjust if needed)
class HistoryItemResponse(BaseModel):
    id: str
    userId: str 
    url: Optional[str] = None
    title: Optional[str] = None
    tldr: str
    keyPoints: List[str] # Ensure this matches schema type
    createdAt: datetime # Ensure this matches schema type
    # updatedAt: datetime # Optionally include
    class Config: # Add Config for ORM mode if returning Prisma model instances directly
        orm_mode = True 

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

# --- NEW: Authentication Dependency with RLS Context Setting ---
async def get_authenticated_user_id_with_rls_context(request: Request, db_prisma: Prisma = Depends(lambda: prisma)) -> str:
    """
    Dependency to authenticate the request using manual JWT verification
    AND set the 'app.current_clerk_id' for RLS policies.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        logger.warning("Auth failed (RLS): Missing/malformed Bearer token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or malformed Bearer token")

    token = auth_header.split(' ')[1]
    user_id = None # Initialize user_id

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
        )
        user_id = claims.get('sub')

    except jwt.exceptions.PyJWKClientError as e:
        logger.error(f"Auth failed (RLS): Error fetching/finding JWKS key - {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error retrieving signing key")
    except jwt.exceptions.ExpiredSignatureError:
        logger.warning("Auth failed (RLS): Token has expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.exceptions.InvalidIssuerError:
        logger.warning(f"Auth failed (RLS): Invalid token issuer. Expected: {CLERK_ISSUER}, Got: {jwt.get_unverified_header(token).get('iss', 'N/A')}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token issuer")
    except jwt.exceptions.InvalidSignatureError:
         logger.warning("Auth failed (RLS): Token signature is invalid")
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
    except jwt.exceptions.DecodeError as e:
        logger.warning(f"Auth failed (RLS): Token decoding error - {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token decode error: {e}")
    except Exception as e:
        logger.exception(f"Auth failed (RLS): Unexpected error during JWT validation - {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unexpected token validation error")

    if not user_id:
        logger.error("Auth successful (RLS) but 'sub' claim missing.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID ('sub' claim) not found in verified token")

    # Set the RLS context for the current transaction/session
    try:
        # The third parameter 'true' in set_config makes it a session-local setting.
        # Using $1 for user_id makes it safe from SQL injection.
        await db_prisma.execute_raw(f"SELECT set_config('app.current_clerk_id', $1, true);", user_id)
        logger.info(f"RLS context set for user: {user_id} ('app.current_clerk_id')")
    except Exception as e:
        logger.error(f"Failed to set RLS context (app.current_clerk_id) for user {user_id}: {e}", exc_info=True)
        # This is a critical failure for RLS to work, so raise an error.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to set security context for the request.")

    logger.info(f"Authenticated user (RLS context): {user_id}")
    return user_id

AuthenticatedUserIdWithRLS = Annotated[str, Depends(get_authenticated_user_id_with_rls_context)]
# --- END NEW ---

# --- Background Tasks ---
async def track_summary_usage(user_clerk_id: str):
    """Increments the summary usage count for the user in the database."""
    try:
        logger.info(f"[Usage Tracking] Attempting to increment usage for Clerk ID: {user_clerk_id}")
        updated_user = await prisma.user.update(
            where={"clerkId": user_clerk_id},
            data={
                "summariesUsed": {"increment": 1},
                "totalSummariesMade": {"increment": 1} # Increment total summaries
            }
        )
        if updated_user:
             logger.info(f"[Usage Tracking] Successfully incremented usage for Clerk ID: {user_clerk_id}. New count: {updated_user.summariesUsed}, Total ever: {updated_user.totalSummariesMade}")
        else:
             # This case should be rare if user exists from check in main endpoint
             logger.error(f"[Usage Tracking] Failed to increment usage: User not found for Clerk ID: {user_clerk_id}")
    except Exception as e:
        # Log error but don't crash the main request
        logger.error(f"[Usage Tracking] Error incrementing usage count for Clerk ID {user_clerk_id}: {e}", exc_info=True)

# --- ADDED: save_summary_to_history function ---
async def save_summary_to_history(
    user_clerk_id: str,
    url: Optional[str],
    title: Optional[str],
    tldr: str,
    key_points: List[str]
):
    """Saves the summary details to the SummaryHistory table."""
    try:
        logger.info(f"[History] Attempting to save summary for Clerk ID: {user_clerk_id}, URL: {url}")
        await prisma.summaryhistory.create(
            data={
                "userId": user_clerk_id,
                "url": url,
                "title": title,
                "tldr": tldr,
                "keyPoints": key_points, # Ensure this matches your Prisma schema (e.g., list of strings)
                # createdAt is usually handled by the database or Prisma default
            }
        )
        logger.info(f"[History] Successfully saved summary for Clerk ID: {user_clerk_id}, URL: {url}")
    except Exception as e:
        logger.error(f"[History] Error saving summary for Clerk ID {user_clerk_id}, URL: {url}: {e}", exc_info=True)
# --- END ADDED ---

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Tildra API is running!"}

# --- Stripe Related Endpoints ---

# Stripe Production Price IDs (use environment variables for flexibility)
PRICE_IDs = {
    "monthly": os.getenv("STRIPE_PRICE_ID_MONTHLY", "price_1RTWE7AGvsrc7mtDIbGZqLgm"), # Production monthly price ID
    "yearly": os.getenv("STRIPE_PRICE_ID_YEARLY", "price_1RUX3xAGvsrc7mtDT8Cx3YZM"),  # Production yearly price ID
}

class CreateCheckoutSessionRequest(BaseModel):
    price_lookup_key: str # e.g., 'monthly' or 'yearly'

@app.post("/create-checkout-session", response_model=CreateCheckoutResponse)
async def create_checkout_session(
    request_data: CreateCheckoutSessionRequest,
    user_clerk_id: AuthenticatedUserIdWithRLS, # MODIFIED for RLS
):
    """Creates a Stripe Checkout session for upgrading to Premium."""
    logger.info(f"Received create_checkout_session request for Clerk ID: {user_clerk_id}, key: {request_data.price_lookup_key}")

    # Verify Stripe configuration is loaded
    if not STRIPE_SECRET_KEY or not STRIPE_WEBHOOK_SECRET:
        logger.error("Stripe API keys are not configured.")
        raise HTTPException(status_code=500, detail="Stripe is not configured on the server.")

    try:
        user = await prisma.user.find_unique(where={"clerkId": user_clerk_id})
        if not user:
            logger.error(f"User not found for Clerk ID: {user_clerk_id} during checkout session creation.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        price_id = PRICE_IDs.get(request_data.price_lookup_key)
        if not price_id:
            logger.error(f"Invalid price key provided: {request_data.price_lookup_key} for Clerk ID: {user_clerk_id}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid price key")

        stripe_customer_id = user.stripeCustomerId

        # If the user doesn't have a Stripe Customer ID, create one
        if not stripe_customer_id:
            try:
                # Use the email from our database instead of fetching from Clerk
                user_email = user.email
                if not user_email:
                    logger.error(f"No email found for user {user_clerk_id}. Cannot create Stripe customer.")
                    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not determine user email for Stripe.")
                
                # Use names from database if available
                user_name = f"{user.firstName} {user.lastName}".strip() if user.firstName and user.lastName else user_email
                
                logger.info(f"Creating Stripe customer for Clerk ID: {user_clerk_id}, Email: {user_email}")
                customer = stripe.Customer.create(
                    email=user_email,
                    metadata={"clerkId": user_clerk_id},
                    name=user_name
                )
                stripe_customer_id = customer.id
                logger.info(f"Updating user record {user_clerk_id} with Stripe Customer ID: {stripe_customer_id}")
                await prisma.user.update(
                    where={"clerkId": user_clerk_id},
                    data={"stripeCustomerId": stripe_customer_id}
                )
                logger.info(f"Stripe customer {stripe_customer_id} created and linked for Clerk ID: {user_clerk_id}")
            except stripe.error.StripeError as e:
                logger.error(f"Stripe API error creating customer for {user_clerk_id}: {e}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Stripe customer creation failed: {str(e)}")
            except Exception as e: # Catch other potential errors
                logger.error(f"Error creating Stripe customer for {user_clerk_id}: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to prepare user data for Stripe.")

        # Create new Checkout Session
        logger.info(f"Creating Stripe Checkout session for customer: {stripe_customer_id}, price: {price_id}")
        checkout_session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            payment_method_types=['card'],
            line_items=[
                {
                    'price': price_id,
                    'quantity': 1,
                },
            ],
            mode='subscription',
            allow_promotion_codes=True,
            success_url=SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=CANCEL_URL,
            metadata={
                'clerk_user_id': user_clerk_id # Include clerk_user_id for webhook handler
            }
        )
        return CreateCheckoutResponse(sessionId=checkout_session.id, url=checkout_session.url)

    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error during checkout session creation for Clerk ID {user_clerk_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Stripe API error: {str(e)}")
    except HTTPException as e: # Re-raise known HTTPExceptions
        raise e 
    except Exception as e:
        logger.error(f"Unexpected error in create_checkout_session for Clerk ID {user_clerk_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred. Please try again later.")

@app.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    """Handles incoming webhooks from Stripe."""
    payload = await request.body()
    sig_header = request.headers.get('Stripe-Signature')
    event = None

    if not STRIPE_WEBHOOK_SECRET:
        logger.error("Webhook processing failed: STRIPE_WEBHOOK_SECRET not set.")
        # Don't reveal config issues externally, return generic server error
        raise HTTPException(status_code=500, detail="Internal server error.")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        logger.info(f"Received Stripe webhook event: ID={event.id}, Type={event.type}")
    except ValueError as e:
        # Invalid payload
        logger.warning(f"Webhook error: Invalid payload - {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.warning(f"Webhook error: Invalid signature - {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Webhook error: Unexpected error constructing event - {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error processing webhook.")

    # Handle the event
    if event.type == 'checkout.session.completed':
        session = event.data.object # The Checkout Session object
        logger.info(f"Handling checkout.session.completed for session: {session.id}")

        # Extract necessary information
        stripe_customer_id = session.get('customer')
        stripe_subscription_id = session.get('subscription')

        if not stripe_customer_id or not stripe_subscription_id:
            logger.error(f"Missing customer or subscription ID in checkout session {session.id}")
            return {"error": "Missing data in webhook payload"}

        try:
            # Retrieve the subscription to get price details and current period end
            logger.info(f"Retrieving subscription: {stripe_subscription_id}")
            subscription = stripe.Subscription.retrieve(stripe_subscription_id)

            # Extract price ID and period end
            stripe_price_id = None
            period_end_timestamp = None

            items_object = subscription.get('items')
            if items_object and hasattr(items_object, 'data') and items_object.data:
                first_item = items_object.data[0]
                plan = first_item.get('plan')
                price = first_item.get('price')
                
                if plan:
                    stripe_price_id = plan.get('id')
                elif price:
                    stripe_price_id = price.get('id')
                
                period_end_timestamp = subscription.get('current_period_end')

            if not stripe_price_id or not period_end_timestamp:
                logger.error(f"Missing price ID or period end. Price: {stripe_price_id}, Period: {period_end_timestamp}")
                return {"error": "Missing subscription data"}

            stripe_current_period_end = datetime.fromtimestamp(period_end_timestamp, tz=timezone.utc)
            logger.info(f"Extracted: Price={stripe_price_id}, PeriodEnd={stripe_current_period_end}")

            # Find user by Stripe Customer ID
            user = await prisma.user.find_unique(where={"stripeCustomerId": stripe_customer_id})
            if not user:
                logger.error(f"User not found for stripe_customer_id: {stripe_customer_id}")
                return {"error": "User not found"}

            logger.info(f"Found user: {user.clerkId} - Current plan: {user.plan}")

            # Update User Record to Premium
            update_data = {
                "plan": "premium",
                "summaryLimit": 500,
                "stripeSubscriptionId": stripe_subscription_id,
                "stripePriceId": stripe_price_id,
                "stripeCurrentPeriodEnd": stripe_current_period_end,
                "summariesUsed": 0,
                "usageResetAt": stripe_current_period_end
            }
            
            logger.info(f"UPGRADING USER {user.clerkId} TO PREMIUM")
            updated_user = await prisma.user.update(
                where={"stripeCustomerId": stripe_customer_id},
                data=update_data
            )
            
            if updated_user:
                logger.info(f"SUCCESS: User {user.clerkId} upgraded to plan: {updated_user.plan}, limit: {updated_user.summaryLimit}")
            else:
                logger.error(f"FAILED: Database update returned None for user {user.clerkId}")

        except stripe.error.StripeError as e:
            logger.error(f"Stripe API error: {e}")
            return {"error": f"Stripe API error: {e}"}
        except Exception as e:
            logger.error(f"Critical error in checkout completion: {e}", exc_info=True)
            return {"error": f"Processing error: {e}"}

    # --- ADDED: Handler for invoice.payment_succeeded ---
    elif event.type == 'invoice.payment_succeeded':
        invoice = event.data.object
        stripe_subscription_id = invoice.get('subscription')
        stripe_customer_id = invoice.get('customer')

        logger.info(f"Handling invoice.payment_succeeded for subscription: {stripe_subscription_id}, customer: {stripe_customer_id}")

        if not stripe_subscription_id or not stripe_customer_id:
            logger.error(f"Webhook invoice.payment_succeeded: Missing subscription or customer ID. Invoice: {invoice.id}")
            return {"status": "error", "message": "Missing subscription or customer ID in invoice"}

        # Only process if it's for a subscription (not a one-time payment if you have those)
        # And if it's not the very first payment of a new subscription (which is handled by checkout.session.completed)
        if invoice.billing_reason == 'subscription_cycle' or invoice.billing_reason == 'subscription_update':
            try:
                # Retrieve the subscription to get the new current_period_end
                logger.info(f"Retrieving subscription {stripe_subscription_id} for renewal update.")
                subscription = stripe.Subscription.retrieve(stripe_subscription_id)
                new_period_end_timestamp = subscription.current_period_end
                new_period_end_datetime = datetime.fromtimestamp(new_period_end_timestamp, tz=timezone.utc)

                logger.info(f"Subscription {stripe_subscription_id} renewed. New period end: {new_period_end_datetime}")

                user = await prisma.user.find_unique(where={"stripeCustomerId": stripe_customer_id})
                if not user:
                    logger.error(f"Webhook invoice.payment_succeeded: User not found for Stripe Customer ID {stripe_customer_id}. Sub ID: {stripe_subscription_id}")
                    return {"status": "error", "message": "User not found for subscription renewal."}

                # Only update if the user is currently on a premium plan
                if user.plan == "premium":
                    update_data = {
                        "summariesUsed": 0, # Reset usage count
                        "usageResetAt": new_period_end_datetime, # Update reset date to new period end
                        "stripeCurrentPeriodEnd": new_period_end_datetime # Also update the stored period end
                    }
                    await prisma.user.update(
                        where={"stripeCustomerId": stripe_customer_id},
                        data=update_data
                    )
                    logger.info(f"Successfully reset summary usage for premium user {user.clerkId} (Stripe Sub: {stripe_subscription_id}) upon renewal.")
                else:
                    logger.info(f"User {user.clerkId} (Stripe Sub: {stripe_subscription_id}) is not on premium plan. No usage reset needed for renewal.")

            except stripe.error.StripeError as e:
                logger.error(f"Stripe API error during subscription retrieval for renewal (Sub ID: {stripe_subscription_id}): {e}", exc_info=True)
                # Don't crash, but log. Stripe will retry webhooks.
            except Exception as e:
                logger.error(f"Error processing invoice.payment_succeeded for subscription {stripe_subscription_id}: {e}", exc_info=True)
        else:
            logger.info(f"Skipping invoice.payment_succeeded for invoice {invoice.id} with reason '{invoice.billing_reason}'. Not a typical renewal or update.")

    else:
        logger.info(f"Unhandled event type: {event.type}")

    # Acknowledge receipt to Stripe
    return {"received": True}

@app.post("/clerk-webhook")
async def clerk_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handles incoming webhooks from Clerk.
    Verifies the signature and processes user.created events.
    """
    if not CLERK_WEBHOOK_SECRET:
        logger.error("Webhook processing failed: Signing secret not configured.")
        raise HTTPException(status_code=500, detail="Webhook secret not configured on server.")

    # Get headers and body needed for verification
    headers = request.headers
    try:
        payload = await request.body()
    except Exception as e:
        logger.error(f"Error reading webhook request body: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Error reading request body.")

    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        logger.warning("Webhook missing required Svix headers.")
        raise HTTPException(status_code=400, detail="Missing Svix headers")

    # Verify the webhook signature
    try:
        # logger.info(f"Attempting to verify webhook with secret: {CLERK_WEBHOOK_SECRET}") 
        wh = Webhook(CLERK_WEBHOOK_SECRET)
        evt = wh.verify(payload, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        })
        logger.info(f"Clerk Webhook verified successfully. Event Type: {evt.get('type')}")
    except WebhookVerificationError as e:
        logger.error(f"Clerk Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Webhook signature verification failed.")
    except Exception as e:
        logger.error(f"Unexpected error during webhook verification: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error verifying webhook.")

    # Process the validated event --- 
    event_type = evt.get("type")
    event_data = evt.get("data", {}) # Default to empty dict if 'data' is missing

    if event_type == "user.created":
        logger.info(f"Processing user.created event for Clerk ID: {event_data.get('id')}")
        try:
            clerk_id = event_data.get("id")
            first_name = event_data.get("first_name")
            last_name = event_data.get("last_name")
            image_url = event_data.get("image_url")
            email_address = None
            email_addresses = event_data.get("email_addresses", [])
            if email_addresses:
                primary_email_obj = next((e for e in email_addresses if e.get("id") == event_data.get("primary_email_address_id")), None)
                if primary_email_obj:
                    email_address = primary_email_obj.get("email_address")
                elif email_addresses: # Fallback to first verified, then first email if no primary found
                    verified_email_obj = next((e for e in email_addresses if e.get("verification", {}).get("status") == "verified"), None)
                    if verified_email_obj:
                        email_address = verified_email_obj.get("email_address")
                    else:
                        email_address = email_addresses[0].get("email_address")
            
            if not clerk_id or not email_address:
                 logger.error(f"Webhook Error user.created: Missing clerk_id or email. ClerkID: {clerk_id}, Email: {email_address}, EventData: {event_data}")
                 return {"status": "error", "message": "Missing required user data (clerkId or email) in user.created event."}

            existing_user_by_clerk_id = await prisma.user.find_unique(where={"clerkId": clerk_id})
            if existing_user_by_clerk_id:
                 logger.warning(f"Webhook Info user.created: User with clerkId {clerk_id} already exists. Skipping creation.")
                 return {"status": "ok", "message": "User already exists."}

            # Check if email exists and link if necessary (idempotency for existing email with different clerkId)
            existing_user_by_email = await prisma.user.find_unique(where={"email": email_address})
            if existing_user_by_email:
                logger.warning(f"Webhook Info user.created: Email {email_address} already exists for user {existing_user_by_email.id}. Linking this new Clerk ID {clerk_id}.")
                await prisma.user.update(where={"email": email_address}, data={"clerkId": clerk_id, "firstName": first_name, "lastName": last_name, "profileImageUrl": image_url})
                return {"status": "ok", "message": "Existing user by email linked to new Clerk ID."}

            new_user = await prisma.user.create(
                data={
                    "clerkId": clerk_id,
                    "email": email_address,
                    "firstName": first_name,
                    "lastName": last_name,
                    "profileImageUrl": image_url,
                    "plan": "free",
                    "summaryLimit": 10, 
                    "summariesUsed": 0,
                    "totalSummariesMade": 0, # Initialize total summaries
                    "usageResetAt": datetime.now(timezone.utc)
                }
            )
            logger.info(f"Successfully created user in DB for Clerk ID: {new_user.clerkId}")
            
            # --- ADDED: Send welcome email --- 
            if new_user and new_user.email:
                logger.info(f"Scheduling welcome email for new user: {new_user.email}")
                # Use the background_tasks instance defined earlier in the endpoint
                await send_welcome_email(new_user.email, new_user.firstName, background_tasks)
            # --- END ADDED ---

            return {"status": "ok", "message": "User created successfully."}
        
        except Exception as e:
            logger.error(f"Webhook Error user.created: Failed to process for Clerk ID {event_data.get('id')}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to process user.created event.")

    elif event_type == "user.updated":
        clerk_id = event_data.get("id")
        logger.info(f"Processing user.updated event for Clerk ID: {clerk_id}")
        if not clerk_id:
            logger.error(f"Webhook Error user.updated: Missing clerk_id. EventData: {event_data}")
            return {"status": "error", "message": "Missing clerk_id in user.updated event."}
        try:
            first_name = event_data.get("first_name")
            last_name = event_data.get("last_name")
            image_url = event_data.get("image_url")
            email_address = None
            email_addresses = event_data.get("email_addresses", [])
            if email_addresses:
                primary_email_obj = next((e for e in email_addresses if e.get("id") == event_data.get("primary_email_address_id")), None)
                if primary_email_obj:
                    email_address = primary_email_obj.get("email_address")
                elif email_addresses: # Fallback to first verified, then first email
                    verified_email_obj = next((e for e in email_addresses if e.get("verification", {}).get("status") == "verified"), None)
                    if verified_email_obj:
                        email_address = verified_email_obj.get("email_address")
                    else:
                        email_address = email_addresses[0].get("email_address")

            update_payload = {
                "firstName": first_name,
                "lastName": last_name,
                "profileImageUrl": image_url
            }
            if email_address: # Only update email if we successfully determined one
                update_payload["email"] = email_address
            
            # Remove keys where value is None to avoid overwriting existing data with None if not provided in event
            update_payload_cleaned = {k: v for k, v in update_payload.items() if v is not None}

            if not update_payload_cleaned:
                logger.info(f"Webhook Info user.updated: No relevant fields to update for Clerk ID: {clerk_id}. Skipping DB update.")
                return {"status": "ok", "message": "No fields to update."}

            updated_user = await prisma.user.update(
                where={"clerkId": clerk_id},
                data=update_payload_cleaned
            )
            if updated_user:
                logger.info(f"Successfully updated user in DB for Clerk ID: {clerk_id}")
                return {"status": "ok", "message": "User updated successfully."}
            else:
                # This might happen if the user was deleted from DB between webhook firing and processing
                logger.warning(f"Webhook Info user.updated: User with Clerk ID {clerk_id} not found for update. May have been deleted.")
                return {"status": "ok", "message": "User not found for update."}
        except Exception as e:
            logger.error(f"Webhook Error user.updated: Failed for Clerk ID {clerk_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to process user.updated event.")

    elif event_type == "user.deleted":
        clerk_id = event_data.get("id")
        logger.info(f"Processing user.deleted event for Clerk ID: {clerk_id}")
        if not clerk_id:
            logger.error(f"Webhook Error user.deleted: Missing clerk_id. EventData: {event_data}")
            return {"status": "error", "message": "Missing clerk_id in user.deleted event."}
        try:
            # First, delete all summary history records for this user to avoid foreign key constraint
            logger.info(f"Deleting summary history for user: {clerk_id}")
            deleted_history = await prisma.summaryhistory.delete_many(
                where={"userId": clerk_id}
            )
            logger.info(f"Deleted {deleted_history.count if hasattr(deleted_history, 'count') else 'unknown'} summary history records for user: {clerk_id}")
            
            # Now delete the user
            deleted_user = await prisma.user.delete(where={"clerkId": clerk_id})
            if deleted_user:
                logger.info(f"Successfully deleted user from DB for Clerk ID: {clerk_id}")
                return {"status": "ok", "message": "User deleted successfully."}
            else:
                # This implies user was already deleted from our DB
                logger.warning(f"Webhook Info user.deleted: User with Clerk ID {clerk_id} not found for deletion. Already deleted? Event Data: {event_data}")
                return {"status": "ok", "message": "User not found, already deleted?"}
        except Exception as e: # Catch specific Prisma errors like RecordNotFound if needed
            logger.error(f"Webhook Error user.deleted: Failed for Clerk ID {clerk_id}: {e}", exc_info=True)
            # If Prisma's delete throws an error because record not found, it's okay for idempotency.
            # Check if the error indicates record not found. Prisma's P2025 error.
            if "NotFoundError" in str(e) or (hasattr(e, 'code') and e.code == 'P2025'):
                 logger.warning(f"Webhook Info user.deleted: User with Clerk ID {clerk_id} already deleted (Prisma P2025). Event Data: {event_data}")
                 return {"status": "ok", "message": "User already deleted from DB."}
            raise HTTPException(status_code=500, detail="Failed to process user.deleted event.")

    else:
        logger.info(f"Received Clerk webhook event type '{event_type}', but no specific handler is configured beyond create/update/delete.")
        return {"status": "ok", "message": "Event received but no specific handler executed."}

@app.post("/summarize", response_model=SummarizeResponse)
async def summarize_article(
    request_data: SummarizeRequest,
    user_clerk_id: AuthenticatedUserIdWithRLS, # MODIFIED for RLS
    background_tasks: BackgroundTasks
):
    logger.info(f"Full request_data received: {request_data.model_dump()}")
    logger.info(f"Received summarize request for user: {user_clerk_id[:5]}... with length: {request_data.summary_length}")

    if not DEEPSEEK_API_KEY:
        logger.error("DeepSeek API key not configured.")
        raise HTTPException(status_code=500, detail="API key for summarization service not configured.")

    user = None
    try:
        logger.debug(f"Checking database for Clerk ID: {user_clerk_id}")
        user = await prisma.user.find_unique(where={"clerkId": user_clerk_id})
        
        if not user: # Should be caught by AuthenticatedUserIdWithRLS, but good to double check
            logger.error(f"User not found in DB for Clerk ID: {user_clerk_id} in /summarize endpoint.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User profile not found.")

        now = datetime.now(timezone.utc)

        # For free users, check and reset daily limit if usageResetAt is before start of today
        if user.plan == "free":
            start_of_current_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            if user.usageResetAt < start_of_current_day:
                logger.info(f"Daily usage period expired for free user Clerk ID: {user_clerk_id}. Resetting count.")
                user = await prisma.user.update(
                    where={"clerkId": user_clerk_id},
                    data={"summariesUsed": 0, "usageResetAt": now} # Reset to now for daily
                )
                if not user: 
                     logger.error(f"Failed to update usage for free user Clerk ID: {user_clerk_id} after daily reset.")
                     raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user usage data.")
        
        # For premium users, the reset is handled by webhooks (invoice.payment_succeeded).
        # We just check if their current period has technically ended according to stored usageResetAt.
        # This can be a fallback if a webhook is delayed or missed, but primary reset is webhook-driven.
        elif user.plan == "premium" and user.usageResetAt and now >= user.usageResetAt:
            logger.warning(f"Premium user {user.clerkId} current period ended ({user.usageResetAt}), but usage not reset by webhook. Current summariesUsed: {user.summariesUsed}. Relying on Stripe webhook for actual reset.")
            # Potentially, one could reset here as a fallback, but it might conflict if webhook is just delayed.
            # For now, just log. The limit check below will still apply against potentially non-reset count.

    except Exception as db_error:
        logger.error(f"Database error during user lookup/reset for Clerk ID {user_clerk_id}: {db_error}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error during usage check.")

    if not user:
        logger.error(f"User not found in DB for Clerk ID: {user_clerk_id}. This should not happen if authenticated.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User profile not found.")

    # Check usage against limits
    if user.summariesUsed >= user.summaryLimit:
        logger.warning(f"Usage limit reached for Clerk ID: {user_clerk_id}. Used: {user.summariesUsed}, Limit: {user.summaryLimit}, Plan: {user.plan}")
        if user.plan == "free":
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Daily summary limit ({user.summaryLimit}) reached.")
        elif user.plan == "premium":
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Monthly summary limit ({user.summaryLimit}) reached. Please wait for your next billing cycle or contact support if you believe this is an error.")
    else:
        logger.info(f"Usage within limits for Clerk ID: {user_clerk_id}. Used: {user.summariesUsed}, Limit: {user.summaryLimit}, Plan: {user.plan}")

    try:
        # Pass summary_length (snake_case) to the API call function
        summary_tldr, key_points_list = await call_deepseek_api(request_data.article_text, request_data.summary_length)
        
        # --- Store summary in history and track usage ---
        if not summary_tldr.startswith("Error:"): # Only proceed if not an error
            background_tasks.add_task(
                save_summary_to_history, 
                user_clerk_id=user_clerk_id, 
                url=request_data.url,
                title=request_data.title,
                tldr=summary_tldr, 
                key_points=key_points_list
            )
            background_tasks.add_task( # Add usage tracking here
                track_summary_usage,
                user_clerk_id=user_clerk_id
            )
        # -----------------------------
        
        return SummarizeResponse(tldr=summary_tldr, key_points=key_points_list)
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error calling DeepSeek API: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"External API error (DeepSeek): {e.response.status_code}")
    except httpx.RequestError as e:
        logger.error(f"Request error calling DeepSeek API: {e}")
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="External API request failed (DeepSeek). Please try again later.")
    except Exception as e:
        logger.error(f"Unexpected error in summarize_article for user {user_clerk_id[:5]}...: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred. Please try again later.")

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

# --- MODIFIED: User Account Details Endpoint ---
@app.get("/api/user/account-details", response_model=UserAccountDetailsResponse)
async def get_user_account_details(user_id: AuthenticatedUserIdWithRLS): # MODIFIED for RLS
    """
    Retrieves account details for the authenticated user.
    """
    try:
        user = await prisma.user.find_unique(where={"clerkId": user_id})
        if user:
            return UserAccountDetailsResponse(
                email=user.email,
                plan=user.plan,
                summariesUsed=user.summariesUsed,
                summaryLimit=user.summaryLimit,
                is_pro=user.plan == "premium"
            )
        else:
            # This case should ideally not happen if user_id from token is valid
            # and Clerk webhooks are correctly creating users.
            logger.error(f"User not found in DB for Clerk ID: {user_id} during account details fetch.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
    except Exception as e:
        logger.error(f"Error fetching user account details for {user_id}: {e}", exc_info=True)
        # Return a generic error response, or re-raise for FastAPI's default 500 handling
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching account details.")

# --- ADDED: User Status Endpoint --- 
@app.get("/api/user/status", response_model=UserStatusResponse)
async def get_user_status(user_id: AuthenticatedUserIdWithRLS): # MODIFIED for RLS
    """Retrieves the pro status for the authenticated user."""
    logger.info(f"Fetching status for Clerk ID: {user_id}")
    try:
        user = await prisma.user.find_unique(where={"clerkId": user_id})
        if not user:
            logger.error(f"User status check failed: User not found in DB for Clerk ID: {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
        
        is_pro_status = user.plan == "premium"
        logger.info(f"User {user_id} status check complete. Is Pro: {is_pro_status}")
        return UserStatusResponse(is_pro=is_pro_status)
        
    except Exception as e:
        logger.error(f"Error fetching user status for {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching user status.")
# --- END ADDED --- 

# --- ADDED: History Endpoint --- 
@app.get("/api/history", response_model=List[HistoryItemResponse])
async def get_user_history(user_id: AuthenticatedUserIdWithRLS): # MODIFIED for RLS
    """Retrieves the summary history for the authenticated user."""
    logger.info(f"Fetching history for Clerk ID: {user_id}")
    try:
        history_items = await prisma.summaryhistory.find_many(
            where={"userId": user_id},
            order={"createdAt": "desc"},
            take=100 # Limit results
        )
        logger.info(f"Found {len(history_items)} history items for user {user_id}")
        # Directly return the list - Pydantic with orm_mode handles conversion
        return history_items 

    except Exception as e:
        logger.error(f"Error fetching history for {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching summary history.")
# --- END ADDED --- 

# --- ADDED: Delete Single History Item Endpoint ---
@app.delete("/api/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_single_history_item(history_id: str, user_id: AuthenticatedUserIdWithRLS): # MODIFIED for RLS
    """Deletes a specific summary history item for the authenticated user."""
    logger.info(f"Attempting to delete history item {history_id} for user {user_id}")
    try:
        # Find the item first to ensure it belongs to the user
        item_to_delete = await prisma.summaryhistory.find_first(
            where={
                "id": history_id,
                "userId": user_id # IMPORTANT: Ensure user owns the item
            }
        )

        if not item_to_delete:
            logger.warning(f"History item {history_id} not found or not owned by user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found or access denied.")

        # If found and owned, proceed with deletion
        await prisma.summaryhistory.delete(where={"id": history_id})
        logger.info(f"Successfully deleted history item {history_id} for user {user_id}")
        # Return No Content on successful deletion
        return

    except HTTPException as http_exc: # Re-raise HTTP exceptions directly
        raise http_exc
    except Exception as e:
        logger.error(f"Error deleting history item {history_id} for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error deleting history item.")

# --- ADDED: Delete All History Items Endpoint ---
@app.delete("/api/history", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_user_history(user_id: AuthenticatedUserIdWithRLS): # MODIFIED for RLS
    """Deletes all summary history items for the authenticated user."""
    logger.info(f"Attempting to delete ALL history for user {user_id}")
    try:
        await prisma.summaryhistory.delete_many(
            where={"userId": user_id} # Delete only items belonging to this user
        )
        logger.info(f"Successfully deleted all history for user {user_id}")
        # Return No Content on successful deletion
        return

    except Exception as e:
        logger.error(f"Error deleting all history for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error clearing history.")
# --- END ADDED --- 

# --- ADDED: User Settings Models and Endpoints ---
class UserSettingsResponse(BaseModel):
    emailNotifications: bool
    summaryNotifications: bool
    marketingEmails: bool

class UserSettingsUpdateRequest(BaseModel):
    emailNotifications: bool
    summaryNotifications: bool
    marketingEmails: bool

@app.get("/api/user/settings", response_model=UserSettingsResponse)
async def get_user_settings(user_id: AuthenticatedUserIdWithRLS):
    """Retrieves notification settings for the authenticated user."""
    logger.info(f"Fetching settings for Clerk ID: {user_id}")
    try:
        user = await prisma.user.find_unique(
            where={"clerkId": user_id}
        )
        
        if not user:
            logger.error(f"User not found in DB for Clerk ID: {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
        
        # Return settings with defaults if None
        return UserSettingsResponse(
            emailNotifications=user.emailNotifications if user.emailNotifications is not None else True,
            summaryNotifications=user.summaryNotifications if user.summaryNotifications is not None else True,
            marketingEmails=user.marketingEmails if user.marketingEmails is not None else False,
        )
        
    except Exception as e:
        logger.error(f"Error fetching user settings for {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching user settings.")

@app.put("/api/user/settings", response_model=UserSettingsResponse)
async def update_user_settings(
    settings_update: UserSettingsUpdateRequest,
    user_id: AuthenticatedUserIdWithRLS
):
    """Updates notification settings for the authenticated user."""
    logger.info(f"Updating settings for Clerk ID: {user_id}")
    try:
        # Update user notification settings
        await prisma.user.update(
            where={"clerkId": user_id},
            data={
                "emailNotifications": settings_update.emailNotifications,
                "summaryNotifications": settings_update.summaryNotifications,
                "marketingEmails": settings_update.marketingEmails,
                "updatedAt": datetime.now(timezone.utc),
            }
        )
        
        # Fetch the updated user data to return
        updated_user = await prisma.user.find_unique(where={"clerkId": user_id})

        if not updated_user:
            logger.error(f"Failed to refetch user after update for Clerk ID: {user_id}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to confirm settings update.")

        logger.info(f"Successfully updated settings for user {user_id}")
        return UserSettingsResponse(
            emailNotifications=updated_user.emailNotifications if updated_user.emailNotifications is not None else True,
            summaryNotifications=updated_user.summaryNotifications if updated_user.summaryNotifications is not None else True,
            marketingEmails=updated_user.marketingEmails if updated_user.marketingEmails is not None else False,
        )
        
    except Exception as e:
        logger.error(f"Error updating user settings for {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error updating user settings.")
# --- END ADDED ---

# --- ADDED: Function to send welcome email via Brevo ---
async def send_welcome_email(user_email: str, user_first_name: Optional[str], background_tasks: BackgroundTasks):
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not configured. Cannot send welcome email.")
        return

    # Use a default if first name is not available
    first_name_greeting = user_first_name if user_first_name else "Friend" # Default for greeting if no first name
    # frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000") # Not needed if HTML is in Brevo

    # --- MODIFIED FOR TEMPLATE ID ---
    template_id = 2 
    # Prepare params for Brevo template. Template uses {{params.userName}}
    params_payload = {"userName": first_name_greeting}

    # The subject and HTML content are now defined in the Brevo template
    # email_subject = f"Welcome to Tildra, {first_name_greeting}!"
    # email_html_content = f"""...""" # Removed

    payload = {
        "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL}, # This can override template sender if needed
        "to": [{"email": user_email, "name": user_first_name if user_first_name else user_email}],
        # "subject": email_subject, # Subject is now in the template
        # "htmlContent": email_html_content, # HTML is now in the template
        "templateId": template_id,
        "params": params_payload
    }
    # --- END MODIFICATION ---

    async def task():
        logger.info(f"[Welcome Email Task EXECUTION STARTED] For {user_email}") # ADDED: Log at start of task execution
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"[Welcome Email Task] Attempting to send email to {user_email} with template ID {template_id}. Payload: {json.dumps(payload)}") # Log payload
                response = await client.post(
                    BREVO_API_URL,
                    headers={
                        "api-key": BREVO_API_KEY,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json=payload,
                    timeout=30.0 # Add a timeout
                )
                logger.info(f"[Welcome Email Task] Brevo API response status: {response.status_code} for {user_email}") # Log status code
                response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
                logger.info(f"[Welcome Email Task] Welcome email successfully sent to {user_email}. Message ID: {response.json().get('messageId')}")
            except httpx.HTTPStatusError as e:
                # Log the full response content for HTTPStatusError for more details
                logger.error(f"[Welcome Email Task] HTTP error sending welcome email to {user_email}: {e.response.status_code} - {e.response.text}", exc_info=True)
            except httpx.RequestError as e:
                logger.error(f"[Welcome Email Task] Request error sending welcome email to {user_email}: {e}", exc_info=True)
            except Exception as e:
                logger.error(f"[Welcome Email Task] Unexpected error sending welcome email to {user_email}: {e}", exc_info=True)
    
    logger.info(f"[Welcome Email] About to add welcome email task for {user_email} to background.") # ADDED
    background_tasks.add_task(task)
    logger.info(f"[Welcome Email] Successfully added welcome email task for {user_email} to background.") # ADDED
# --- END ADDED ---

# --- Helper function to call DeepSeek API ---
async def call_deepseek_api(article_text: str, summary_length_param: str = "standard") -> tuple[str, list[str]]:
    if not DEEPSEEK_API_KEY:
        logger.error("DeepSeek API key is not configured.")
        # RAISE an exception instead of returning an error tuple
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Summarization service is not configured (API key missing).")

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    
    # Truncate article to avoid huge payloads
    truncated_article = article_text[:15000]
    
    # Configure parameters based on summary_length_param
    if summary_length_param == "brief":
        system_prompt = (
            "You are a concise summarization AI. Always respond in JSON format only. "
            "Your response must be valid JSON with exactly two keys: 'tldr' and 'key_points'."
        )
        user_prompt = (
            f"Summarize this article in JSON format with these exact requirements:\\n"
            f"- Return only JSON with 'tldr' and 'key_points' keys\\n"
            f"- TL;DR: ONE short sentence (max 15 words)\\n"
            f"- Key Points: Array of 2-3 brief points (each max 10 words)\\n\\n"
            f"Example JSON response: {{ \"tldr\": \"Brief summary here\", \"key_points\": [\"Point 1\", \"Point 2\"] }}\\n\\n"
            f"Article to summarize:\\n{truncated_article}"
        )
        max_tokens = 300
        temperature = 0.3
        
    elif summary_length_param == "detailed":
        system_prompt = (
            "You are a comprehensive summarization AI. Always respond in JSON format only. "
            "Your response must be valid JSON with exactly two keys: 'tldr' and 'key_points'."
        )
        user_prompt = (
            f"Summarize this article in JSON format with these exact requirements:\\n"
            f"- Return only JSON with 'tldr' and 'key_points' keys\\n"
            f"- TL;DR: Detailed paragraph (3-5 sentences, 50-100 words)\\n"
            f"- Key Points: Array of 7-9 comprehensive points (each 15-25 words)\\n\\n"
            f"Example JSON response: {{ \"tldr\": \"Detailed summary paragraph here\", \"key_points\": [\"Detailed point 1\", \"Detailed point 2\"] }}\\n\\n"
            f"Article to summarize:\\n{truncated_article}"
        )
        max_tokens = 2000
        temperature = 0.8
        
    else:  # standard (or if summary_length_param is None/unexpected)
        system_prompt = (
            "You are a balanced summarization AI. Always respond in JSON format only. "
            "Your response must be valid JSON with exactly two keys: 'tldr' and 'key_points'."
        )
        user_prompt = (
            f"Summarize this article in JSON format with these exact requirements:\\n"
            f"- Return only JSON with 'tldr' and 'key_points' keys\\n"
            f"- TL;DR: 2-3 sentences (30-50 words total)\\n"
            f"- Key Points: Array of 4-6 points (each 10-15 words)\\n\\n"
            f"Example JSON response: {{ \"tldr\": \"Standard summary here\", \"key_points\": [\"Point 1\", \"Point 2\", \"Point 3\"] }}\\n\\n"
            f"Article to summarize:\\n{truncated_article}"
        )
        max_tokens = 1000
        temperature = 0.6

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
        "response_format": {"type": "json_object"}
    }

    async with httpx.AsyncClient() as client:
        try:
            logger.debug(f"Calling DeepSeek API with payload: {json.dumps(payload, indent=2)}")
            response = await client.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=90.0) # Increased timeout
            response.raise_for_status()  # Raise an exception for bad status codes
            
            response_data = response.json()
            logger.debug(f"Raw DeepSeek response: {response_data}")

            # Validate the structure of the response
            if not isinstance(response_data, dict) or "choices" not in response_data or not response_data["choices"]:
                logger.error(f"DeepSeek API response is not a valid JSON object or missing 'choices': {response_data}")
                raise ValueError("DeepSeek API response is not a valid JSON object or missing 'choices'.")

            message_content_str = response_data["choices"][0].get("message", {}).get("content")
            if not message_content_str:
                logger.error(f"DeepSeek API response missing message content: {response_data}")
                raise ValueError("DeepSeek API response missing message content.")

            try:
                content_json = json.loads(message_content_str)
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding message content JSON from DeepSeek: {message_content_str} - {e}")
                raise ValueError("Error decoding message content from DeepSeek.")

            tldr = content_json.get("tldr")
            key_points = content_json.get("key_points")

            if tldr is None or key_points is None:
                logger.error(f"DeepSeek API response missing 'tldr' or 'key_points': {response_data}")
                raise ValueError("DeepSeek API response is missing 'tldr' or 'key_points'.")
            
            if not isinstance(tldr, str) or not isinstance(key_points, list):
                logger.error(f"DeepSeek API 'tldr' is not a string or 'key_points' is not a list: {response_data}")
                raise ValueError("'tldr' must be a string and 'key_points' must be a list.")

            return tldr, key_points

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from DeepSeek API: Status {e.response.status_code} - {e.response.text}", exc_info=True)
            detail = f"Summarization service returned an error: {e.response.status_code}."
            if e.response.status_code == 401 or e.response.status_code == 403: # Unauthorized or Forbidden from DeepSeek
                 detail = "Summarization service authentication failed. Please check API key."
            elif e.response.status_code == 429:
                detail = "Summarization service is temporarily busy (rate limit). Please try again shortly."
            elif e.response.status_code >= 500:
                detail = "Summarization service is currently unavailable. Please try again later."
            # RAISE an exception instead of returning an error tuple
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
        except httpx.RequestError as e:
            logger.error(f"Request error calling DeepSeek API: {e}", exc_info=True)
            # RAISE an exception instead of returning an error tuple
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not connect to the summarization service.")
        except (json.JSONDecodeError, ValueError) as e: # Catch parsing/validation errors
            logger.error(f"Error parsing or validating DeepSeek API response: {e}", exc_info=True)
            # RAISE an exception instead of returning an error tuple
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Received an invalid response from the summarization service.")
        except Exception as e:
            logger.error(f"Unexpected error in call_deepseek_api during DeepSeek interaction: {e}", exc_info=True)
            # RAISE an exception instead of returning an error tuple
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="An unexpected error occurred while communicating with the summarization service.")

# --- ADD Contact Form Model ---
class ContactFormRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)
    recipient: str = Field(default="tildra.help@gmail.com")

# --- ADD Contact Form Endpoint ---
@app.post("/api/contact")
async def contact_form(contact_request: ContactFormRequest):
    """
    Handle contact form submissions and send email to support
    """
    try:
        # Validate email format
        import re
        email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_pattern, contact_request.email):
            raise HTTPException(status_code=400, detail="Invalid email format")
        
        # Send email to support using Brevo (synchronously to catch errors)
        await send_contact_form_email(
            contact_request.name,
            contact_request.email,
            contact_request.subject,
            contact_request.message,
            contact_request.recipient
        )
        
        logger.info(f"Contact form submission sent from {contact_request.email} to {contact_request.recipient}")
        
        return {
            "success": True,
            "message": "Your message has been sent successfully. We'll get back to you soon!"
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like validation errors)
        raise
    except Exception as e:
        logger.error(f"Error processing contact form: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to send message. Please try again later.")

# Add validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Convert validation errors to user-friendly messages
    if request.url.path == "/api/contact":
        errors = exc.errors()
        user_friendly_errors = []
        
        for error in errors:
            field = error['loc'][-1] if error['loc'] else 'field'
            error_type = error['type']
            
            if field == 'message' and 'string_too_short' in error_type:
                user_friendly_errors.append("Message must be at least 10 characters long")
            elif field == 'email' and 'string_too_short' in error_type:
                user_friendly_errors.append("Email address is too short")
            elif field == 'name' and 'string_too_long' in error_type:
                user_friendly_errors.append("Name must be less than 100 characters")
            elif field == 'message' and 'string_too_long' in error_type:
                user_friendly_errors.append("Message must be less than 2000 characters")
            else:
                user_friendly_errors.append(f"Invalid {field}: {error['msg']}")
        
        return JSONResponse(
            status_code=422,
            content={"error": "; ".join(user_friendly_errors)}
        )
    
    # Default validation error response for other endpoints
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

# --- ADD Contact Form Email Function ---
async def send_contact_form_email(name: str, email: str, subject: str, message: str, recipient: str):
    """Send contact form submission to support email"""
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not configured. Cannot send contact form email.")
        raise HTTPException(status_code=500, detail="Email service not configured")

    # Prepare email content
    email_subject = f"Contact Form: {subject}"
    email_html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Contact Form Submission - Tildra</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
            .content {{ background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }}
            .footer {{ margin-top: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }}
            .field {{ margin-bottom: 15px; }}
            .field-label {{ font-weight: bold; color: #495057; }}
            .field-value {{ margin-left: 10px; }}
            .message-content {{ background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; color: #007bff;">New Contact Form Submission</h2>
                <p style="margin: 5px 0 0 0; color: #666;">Received from Tildra.xyz</p>
            </div>
            
            <div class="content">
                <div class="field">
                    <span class="field-label">From:</span>
                    <span class="field-value">{name} &lt;{email}&gt;</span>
                </div>
                
                <div class="field">
                    <span class="field-label">Subject:</span>
                    <span class="field-value">{subject}</span>
                </div>
                
                <div class="field">
                    <span class="field-label">Submitted:</span>
                    <span class="field-value">{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</span>
                </div>
                
                <div class="field">
                    <span class="field-label">Message:</span>
                    <div class="message-content">
                        {message.replace(chr(10), '<br>')}
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>This email was automatically generated from a contact form submission on Tildra.xyz</p>
                <p>To reply to this inquiry, send your response directly to: {email}</p>
            </div>
        </div>
    </body>
    </html>
    """

    payload = {
        "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to": [{"email": recipient, "name": "Tildra Support"}],
        "replyTo": {"email": email, "name": name},
        "subject": email_subject,
        "htmlContent": email_html_content,
    }

    try:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "api-key": BREVO_API_KEY
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(BREVO_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(f"Contact form email sent successfully to {recipient}")
            return True
            
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error sending contact form email: Status {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=500, detail=f"Email service error: {e.response.status_code}")
    except httpx.RequestError as e:
        logger.error(f"Request error sending contact form email: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not connect to email service")
    except Exception as e:
        logger.error(f"Unexpected error sending contact form email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email")
