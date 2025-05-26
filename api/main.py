# Standard library imports
import os
import logging
import json # For parsing DeepSeek response
from datetime import datetime, timezone, timedelta # For usage reset logic
import stripe
import time

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
from typing import Annotated, Optional, Dict, Any, List # Add Any and List
from dotenv import load_dotenv

# --- Prisma Client Import ---
from prisma import Prisma
# --- ADD Webhook Verification Import ---
from svix.webhooks import Webhook, WebhookVerificationError # Corrected import
from prisma.errors import UniqueViolationError # Import DB constraint exception for webhook handler
# --- END ADD ---
# --------------------------

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
CLERK_ISSUER = os.getenv("CLERK_ISSUER_URL", "https://actual-marmot-36.clerk.accounts.dev") # Use env var, fallback
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
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000") # Define FRONTEND_URL here
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
    "http://localhost:3000",                                # Local development frontend
]
# Add the deployed frontend URL if it exists and is different from localhost
if FRONTEND_URL and FRONTEND_URL != "http://localhost:3000":
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
    url: Optional[str] = None # Add optional URL field
    title: Optional[str] = None # Add optional Title field
    summaryLength: Optional[str] = "standard" # Add summaryLength field

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

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Tildra API is running!"}

@app.post("/create-checkout-session", response_model=CreateCheckoutResponse)
async def create_checkout_session(
    checkout_request: CreateCheckoutRequest,
    user_clerk_id: AuthenticatedUserIdWithRLS, # MODIFIED for RLS
):
    """Creates a Stripe Checkout session for upgrading to Premium."""
    logger.info(f"Received create_checkout_session request for Clerk ID: {user_clerk_id}, key: {checkout_request.price_lookup_key}")

    # Verify Stripe configuration is loaded
    if not stripe.api_key or not PREMIUM_PRICE_ID_MONTHLY or not PREMIUM_PRICE_ID_YEARLY:
         logger.error("Stripe configuration is missing or incomplete. Cannot create checkout session.")
         raise HTTPException(status_code=500, detail="Server configuration error preventing checkout.")

    # Determine the Price ID based on the request
    price_id = PREMIUM_PRICE_ID_MONTHLY if checkout_request.price_lookup_key == 'monthly' else PREMIUM_PRICE_ID_YEARLY

    # Basic validation for the provided key
    if checkout_request.price_lookup_key not in ['monthly', 'yearly']:
         logger.warning(f"Invalid price_lookup_key received: {checkout_request.price_lookup_key}")
         raise HTTPException(status_code=400, detail="Invalid billing cycle specified.")

    try:
        # Find user in our DB to get email and potentially existing Stripe Customer ID
        logger.debug(f"Looking up user in DB for Clerk ID: {user_clerk_id}")
        user = await prisma.user.find_unique(where={"clerkId": user_clerk_id})
        if not user:
            logger.error(f"User not found in database for Clerk ID: {user_clerk_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found in our system.")

        stripe_customer_id = user.stripeCustomerId

        # If user doesn't have a Stripe Customer ID yet, create one in Stripe
        if not stripe_customer_id:
            logger.info(f"Creating Stripe customer for Clerk ID: {user_clerk_id}, Email: {user.email}")
            customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.firstName} {user.lastName}" if user.firstName and user.lastName else user.email, # Optional: Add name
                metadata={
                    'clerkId': user_clerk_id # Link Clerk ID in Stripe metadata
                }
            )
            stripe_customer_id = customer.id
            # Save the new Stripe Customer ID to our database
            logger.info(f"Updating user record {user_clerk_id} with Stripe Customer ID: {stripe_customer_id}")
            await prisma.user.update(
                where={"clerkId": user_clerk_id},
                data={"stripeCustomerId": stripe_customer_id}
            )
            logger.info(f"Stripe customer {stripe_customer_id} created and linked for Clerk ID: {user_clerk_id}")
        else:
             logger.info(f"Found existing Stripe customer {stripe_customer_id} for Clerk ID: {user_clerk_id}")

        # Create the Stripe Checkout Session
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
            allow_promotion_codes=True, # Optional: Allow discount codes
            success_url=f'{FRONTEND_URL}/premium-tools', # Redirect to Premium Tools page after successful upgrade
            cancel_url=f'{FRONTEND_URL}/pricing', # Redirect back to pricing on cancel
            # Pass metadata that might be useful in webhooks
            metadata={
                 'clerkId': user_clerk_id
            }
        )
        logger.info(f"Checkout session created: {checkout_session.id}")

        if not checkout_session.url:
             logger.error("Stripe Checkout Session object missing URL after creation.")
             raise HTTPException(status_code=500, detail="Could not retrieve checkout session URL from Stripe.")

        return CreateCheckoutResponse(sessionId=checkout_session.id, url=checkout_session.url)

    except HTTPException as http_exc:
        # Re-raise specific HTTP exceptions (like the 404 above)
        # This prevents them from being caught by the generic Exception handler
        raise http_exc
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error during checkout session creation for Clerk ID {user_clerk_id}: {e}", exc_info=True)
        detail = e.user_message if hasattr(e, 'user_message') and e.user_message else "A payment processing error occurred."
        # Use status code appropriate for Stripe errors (e.g., 500 or 502 Bad Gateway)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Stripe error: {detail}")
    except Exception as e: # Generic handler for truly unexpected errors
        logger.error(f"Unexpected error creating checkout session for Clerk ID {user_clerk_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error creating checkout session.")

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
        # Note: We need to retrieve the subscription to get price and period end

        if not stripe_customer_id or not stripe_subscription_id:
            logger.error(f"Webhook error: Missing customer or subscription ID in checkout session {session.id}")
            return {"error": "Missing data in webhook payload"} # Return 200 OK to Stripe, but log error

        try:
            # Retrieve the subscription to get price details and current period end
            logger.info(f"Retrieving subscription details for ID: {stripe_subscription_id}")
            subscription = stripe.Subscription.retrieve(stripe_subscription_id)
            logger.info(f"Retrieved subscription object: {subscription}")

            # --- Corrected Extraction Logic --- 
            stripe_price_id = None
            period_end_timestamp = None

            # --- Try Dictionary-Style Access --- 
            subscription_items_data = None
            logger.info(f"Attempting dictionary access subscription['items']...")
            items_object = subscription.get('items') # Use .get() for safety

            if items_object and isinstance(items_object, stripe.ListObject):
                logger.info(f"items_object is a ListObject. Type: {type(items_object)}")
                if hasattr(items_object, 'data') and items_object.data:
                    subscription_items_data = items_object.data
                    logger.info("Successfully extracted items_object.data")
                else:
                    logger.warning("items_object does not have .data or .data is empty")
            elif items_object:
                 logger.warning(f"items_object exists but is not a ListObject. Type: {type(items_object)}")
            else:
                 logger.warning("subscription.get('items') returned None")

            if subscription_items_data and len(subscription_items_data) > 0:
                logger.info("Accessing first subscription item via dictionary access...") # Log Step 1
                first_item = subscription_items_data[0] # Get the first item
                
                # Get Price ID from the item's plan or price object
                logger.info(f"First item object: {first_item}") # Log Step 2
                plan = first_item.get('plan')
                price = first_item.get('price')
                logger.info(f"Extracted plan object: {plan}") # Log Step 3
                logger.info(f"Extracted price object: {price}") # Log Step 4

                if plan:
                    stripe_price_id = plan.get('id')
                    logger.info(f"Price ID from plan.get('id'): {stripe_price_id}") # Log Step 5a
                elif price:
                     stripe_price_id = price.get('id')
                     logger.info(f"Price ID from price.get('id'): {stripe_price_id}") # Log Step 5b
                
                # Get Period End from the item itself using .get()
                period_end_timestamp = first_item.get('current_period_end') 
                logger.info(f"Period end timestamp from first_item.get(): {period_end_timestamp}") # Log Step 6
            else:
                # This log now indicates the extraction logic failed
                logger.warning(f"Failed to extract subscription_items_data or it was empty. Items Data: {subscription_items_data}") # Log Step 7
            # --- End Corrected Extraction Logic --- 

            stripe_current_period_end = datetime.fromtimestamp(period_end_timestamp, tz=timezone.utc) if period_end_timestamp else None
            logger.info(f"Converted stripe_current_period_end: {stripe_current_period_end}") # Log Step 8

            if not stripe_price_id or not stripe_current_period_end:
                 # Log with corrected values
                 logger.error(f"Webhook error CHECK FAILED: PriceID: {stripe_price_id}, PeriodEnd DateTime: {stripe_current_period_end}, PeriodEnd Raw: {period_end_timestamp}")
                 return {"error": "Missing data in subscription item check"}

            # Find user by Stripe Customer ID
            logger.info(f"Finding user by stripe_customer_id: {stripe_customer_id}")
            user = await prisma.user.find_unique(where={"stripeCustomerId": stripe_customer_id})

            if not user:
                logger.error(f"Webhook error: User not found for stripe_customer_id: {stripe_customer_id}")
                return {"error": "User not found for Stripe customer"}

            # --- Update User Record --- 
            update_data = {
                "plan": "premium",
                "summaryLimit": 1000,
                "stripeSubscriptionId": stripe_subscription_id,
                "stripePriceId": stripe_price_id,
                "stripeCurrentPeriodEnd": stripe_current_period_end,
                "summariesUsed": 0,
                "usageResetAt": datetime.now(timezone.utc)
            }
            logger.info(f"Attempting to update user {user.clerkId} (DB ID: {user.id}) with data: {update_data}") # Log before update
            
            updated_user = await prisma.user.update(
                where={"stripeCustomerId": stripe_customer_id},
                data=update_data
            )
            
            # Log the result of the update call
            if updated_user:
                 logger.info(f"Prisma update call returned: {updated_user}") # Log the returned object
                 logger.info(f"Successfully processed update for user {user.clerkId} to premium.") # Refined Success Log
            else:
                 # This case shouldn't happen if no error was thrown, but log it just in case
                 logger.error(f"Prisma update call returned None or empty for user {user.clerkId}, update may have failed silently.")
            # --- End Update User Record --- 

        except stripe.error.StripeError as e:
            logger.error(f"Stripe API error retrieving subscription {stripe_subscription_id}: {e}", exc_info=True)
            return {"error": f"Stripe API error: {e}"}
        except Exception as e:
            logger.error(f"Database or other error processing webhook for customer {stripe_customer_id}: {e}", exc_info=True)
            return {"error": f"Internal processing error: {e}"}

    # Add handlers for other event types if needed (e.g., subscription updated/canceled)
    # elif event.type == 'invoice.payment_succeeded':
    #     # Handle successful recurring payment
    #     pass
    # elif event.type == 'customer.subscription.deleted':
    #     # Handle subscription cancellation
    #     pass

    else:
        logger.info(f"Unhandled event type: {event.type}")

    # Acknowledge receipt to Stripe
    return {"received": True}

@app.post("/clerk-webhook")
async def clerk_webhook(request: Request):
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

    # --- Process the validated event --- 
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
                    "summaryLimit": 5, 
                    "summariesUsed": 0,
                    "totalSummariesMade": 0, # Initialize total summaries
                    "usageResetAt": datetime.now(timezone.utc)
                }
            )
            logger.info(f"Successfully created user in DB for Clerk ID: {new_user.clerkId}")
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
            # Clerk sends the full user object that was deleted in event_data for user.deleted
            # If `deleted: true` is present, it's a soft delete by Clerk, you might choose to deactivate or truly delete
            # For now, we will perform a hard delete from our database.
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
    logger.info(f"Received summarize request for user: {user_clerk_id[:5]}... with length: {request_data.summaryLength}")

    if not DEEPSEEK_API_KEY:
        logger.error("DeepSeek API key not configured.")
        raise HTTPException(status_code=500, detail="API key for summarization service not configured.")

    user = None
    try:
        logger.debug(f"Checking database for Clerk ID: {user_clerk_id}")
        user = await prisma.user.find_unique(where={"clerkId": user_clerk_id})
        if user:
            now = datetime.now(timezone.utc)
            start_of_current_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            if user.usageResetAt < start_of_current_day:
                logger.info(f"Usage period expired for Clerk ID: {user_clerk_id}. Resetting daily count.")
                user = await prisma.user.update(
                    where={"clerkId": user_clerk_id},
                    data={"summariesUsed": 0, "usageResetAt": now}
                )
                if not user: 
                     logger.error(f"Failed to update usage for Clerk ID: {user_clerk_id} after reset.")
                     raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user usage data.")
    except Exception as db_error:
        logger.error(f"Database error during user lookup/reset for Clerk ID {user_clerk_id}: {db_error}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error during usage check.")

    if not user:
        logger.error(f"User not found in DB for Clerk ID: {user_clerk_id}. This should not happen if authenticated.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User profile not found.")

    if user.plan == "free":
        if user.summariesUsed >= user.summaryLimit:
            logger.warning(f"Usage limit reached for Clerk ID: {user_clerk_id}.")
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Daily summary limit ({user.summaryLimit}) reached.")
        else:
            logger.info(f"Usage within limits for Clerk ID: {user_clerk_id}.")
    else:
        logger.info(f"Premium user {user_clerk_id} bypassing usage limits.")

    # --- Start: Add Logic for Usage Tracking Before API Call ---
    # try:
    #     user_usage = await track_summary_usage(user_clerk_id)
    #     if user_usage is None: # User not found, should not happen if authenticated
    #         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found for usage tracking.")
    #     
    #     if not user_usage.is_pro and user_usage.summaries_used_today >= user_usage.daily_summary_limit:
    #         logger.warning(f"User {user_clerk_id[:5]}... has reached their daily limit of {user_usage.daily_summary_limit} summaries.")
    #         # Return a specific error structure that the frontend can understand
    #         return SummarizeResponse(tldr="Usage limit reached.", key_points=["Upgrade to Pro for unlimited summaries."]) # Placeholder, adjust as needed by frontend
    #         # Or raise HTTPException if frontend handles it:
    #         # raise HTTPException(
    #         #     status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
    #         #     detail="Daily summary limit reached. Upgrade for unlimited summaries."
    #         # )
    #
    # except HTTPException as e: # Re-raise known HTTP exceptions
    #     raise e 
    # except Exception as e:
    #     logger.error(f"Error during usage tracking for user {user_clerk_id[:5]}...: {e}")
    #     raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error processing your request (usage tracking). Please try again later.")
    # --- End: Usage Tracking Logic ---

    try:
        # Pass summaryLength to the API call function
        summary_tldr, key_points_list = await call_deepseek_api(request_data.article_text, request_data.summaryLength)
        
        # --- Store summary in history ---
        if summary_tldr and key_points_list: # Only save if summarization was successful
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

# --- Helper function to call DeepSeek API ---
async def call_deepseek_api(article_text: str, summary_length: str = "standard") -> tuple[str, list[str]]:
    if not DEEPSEEK_API_KEY:
        logger.error("DeepSeek API key is not configured.")
        # Consider raising an error or returning a specific message
        # For now, let's make it obvious in the output if this happens
        return "Error: DeepSeek API key not set.", ["Please configure the API key on the server."]

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    
    # Base prompt
    base_prompt = (
        f"Please summarize the following article. Provide a concise TL;DR (Too Long; Didn't Read) summary "
        f"and a list of key bullet points. Format the output as a JSON object with two keys: \"tldr\" (a string) "
        f"and \"key_points\" (an array of strings). Article:\n\n{article_text[:15000]}" # Limit article length to avoid huge payloads
    )

    # Adjust prompt based on summary_length
    length_instruction = ""
    if summary_length == "brief":
        length_instruction = " Focus on providing a very short TL;DR and 2-3 crucial key points."
    elif summary_length == "detailed":
        length_instruction = " Provide a comprehensive TL;DR and at least 5-7 detailed key points."
    else: # Standard (default)
        length_instruction = " Provide a standard TL;DR and 4-5 important key points."
        
    final_prompt = base_prompt + length_instruction
    
    # Max tokens can also be adjusted, though DeepSeek might handle length well with prompt alone.
    # Let's set a slightly higher max_tokens for detailed summaries if desired.
    max_tokens = 1024
    if summary_length == "detailed":
        max_tokens = 1536
    elif summary_length == "brief":
        max_tokens = 768

    payload = {
        "model": "deepseek-chat", # Use the appropriate model
        "messages": [
            {"role": "system", "content": "You are an expert summarization AI. Provide summaries in the requested JSON format."},
            {"role": "user", "content": final_prompt}
        ],
        "max_tokens": max_tokens, # Adjust as needed
        "temperature": 0.7, # Adjust for creativity vs. factuality
        "response_format": { "type": "json_object" } # Request JSON output
    }

    async with httpx.AsyncClient(timeout=60.0) as client: # Increased timeout to 60s
        try:
            logger.info(f"Calling DeepSeek API. Length preference: {summary_length}. Prompt snippet: {final_prompt[:100]}...")
            response = await client.post(DEEPSEEK_API_URL, json=payload, headers=headers)
            response.raise_for_status() # Will raise HTTPStatusError for 4xx/5xx responses
            
            response_data = response.json()
            logger.info(f"DeepSeek API response received. Choice 0 content: {response_data.get('choices',[{}])[0].get('message',{}).get('content', '')[:100]}...")

            # Extract content from the correct part of the response
            # Assuming the JSON output is directly in the content of the first choice message
            content_str = response_data.get('choices',[{}])[0].get('message',{}).get('content')
            if not content_str:
                logger.error("DeepSeek API response missing content string.")
                return "Error: No content in API response.", []

            try:
                # Attempt to parse the JSON string from the content
                summary_json = json.loads(content_str)
                tldr = summary_json.get("tldr", "Error: TL;DR not found in response.")
                key_points = summary_json.get("key_points", ["Error: Key points not found in response."])
                
                # Basic validation of the parsed structure
                if not isinstance(tldr, str) or not (isinstance(key_points, list) and all(isinstance(item, str) for item in key_points)):
                    logger.error(f"DeepSeek API response JSON structure is not as expected. TLDR type: {type(tldr)}, KeyPoints type: {type(key_points)}")
                    return "Error: API response format incorrect.", ["Please check server logs for DeepSeek API response."]

                return tldr, key_points
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON from DeepSeek response: {e}. Content: {content_str[:200]}...")
                # Fallback: Try to extract TL;DR and Key Points using a simpler split if the JSON is malformed
                # This is a basic fallback and might not always work as expected.
                tldr_fallback = "Could not parse TL;DR."
                key_points_fallback = ["Could not parse key points from API response."]
                
                # Attempt to find TL;DR marker (highly dependent on consistent non-JSON output)
                if "TL;DR:" in content_str:
                    parts = content_str.split("Key Points:", 1)
                    tldr_part = parts[0].replace("TL;DR:", "").strip()
                    if tldr_part:
                        tldr_fallback = tldr_part
                    if len(parts) > 1:
                        key_points_raw = parts[1].strip()
                        # Split bullet points (common formats: -, *, •)
                        key_points_fallback = [p.strip() for p in key_points_raw.split('\n') if p.strip().startswith( ('-', '*', '•') ) and len(p.strip()) > 1]
                        if not key_points_fallback: # If no bullets found, just return raw block
                            key_points_fallback = ["Could not reliably extract key points."]
                
                return tldr_fallback, key_points_fallback
            except Exception as e: # Catch any other unexpected error during parsing
                logger.error(f"Unexpected error parsing DeepSeek response content: {e}", exc_info=True)
                return "Error processing API response.", ["Please try again later."]

        except httpx.HTTPStatusError as e:
            # Log the error and re-raise to be caught by the endpoint handler
            logger.error(f"DeepSeek API HTTPStatusError: {e.response.status_code} - {e.response.text}")
            raise # Re-raise the exception
        except httpx.RequestError as e:
            # Log the error and re-raise
            logger.error(f"DeepSeek API RequestError: {e}")
            raise # Re-raise
        except Exception as e: # Catch-all for other unexpected errors from this function
            logger.error(f"Unexpected error in call_deepseek_api: {e}", exc_info=True)
            # Return a generic error that can be displayed to the user
            return "Error: Failed to communicate with summarization service.", ["Please try again later."]

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
