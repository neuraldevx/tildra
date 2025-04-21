# Standard library imports
import os
import logging
import json # For parsing DeepSeek response
from datetime import datetime, timezone, timedelta # For usage reset logic
import stripe

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
from typing import Annotated, Optional, Dict, Any # Add Any

# --- Prisma Client Import ---
from prisma import Prisma
# --- ADD Webhook Verification Import ---
from svix.webhooks import Webhook, WebhookVerificationError # Corrected import
from prisma.errors import UniqueViolationError # Import DB constraint exception for webhook handler
# --- END ADD ---
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

@app.post("/create-checkout-session", response_model=CreateCheckoutResponse)
async def create_checkout_session(
    checkout_request: CreateCheckoutRequest,
    user_clerk_id: AuthenticatedUserId, # Inject authenticated user ID
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
            # Email handling: Clerk provides an array of emails
            email_address = None
            email_addresses = event_data.get("email_addresses", [])
            if email_addresses:
                # Find the primary email or just take the first one
                primary_email = next((e for e in email_addresses if e.get("verification", {}).get("status") == "verified"), None)
                if primary_email:
                     email_address = primary_email.get("email_address")
                else: # Fallback to the first email if no primary/verified found
                     email_address = email_addresses[0].get("email_address") 
                
            if not clerk_id or not email_address:
                 logger.error(f"Webhook Error: Missing clerk_id or email in user.created event. Data: {event_data}")
                 # Return 200 to Clerk so it doesn't retry, but log error
                 return {"status": "error", "message": "Missing required user data in event."}

            # Check if user already exists (idempotency)
            existing_user = await prisma.user.find_unique(where={"clerkId": clerk_id})
            if existing_user:
                 logger.warning(f"Webhook Info: User with clerkId {clerk_id} already exists. Skipping creation.")
                 return {"status": "ok", "message": "User already exists."}

            # Create the user in the database
            new_user = await prisma.user.create(
                data={
                    "clerkId": clerk_id,
                    "email": email_address,
                    "firstName": first_name, # Can be null
                    "lastName": last_name,   # Can be null
                    "profileImageUrl": image_url, # Can be null
                    # Set defaults for plan, limits, etc.
                    "plan": "free",
                    "summaryLimit": 5, 
                    "summariesUsed": 0,
                    "usageResetAt": datetime.now(timezone.utc)
                }
            )
            logger.info(f"Successfully created user in DB for Clerk ID: {new_user.clerkId}")
            return {"status": "ok", "message": "User created successfully."}
        except UniqueViolationError as e:
            # Handle duplicate email by linking existing user record
            if 'email' in str(e):
                logger.warning(f"Webhook Info: Email {email_address} already exists. Linking Clerk ID {clerk_id} to existing user.")
                updated_user = await prisma.user.update(
                    where={"email": email_address},
                    data={"clerkId": clerk_id}
                )
                logger.info(f"Successfully linked existing user {updated_user.id} with Clerk ID: {clerk_id}")
                return {"status": "ok", "message": "Existing user linked successfully."}
            # Re-raise if it's a different uniqueness constraint
            raise
        except Exception as e:
            logger.error(f"Webhook Error: Failed to create user for Clerk ID {event_data.get('id')}: {e}", exc_info=True)
            # Return 500 so Clerk might retry, or handle specific DB errors
            raise HTTPException(status_code=500, detail="Failed to process user creation.")

    # Handle other event types if needed in the future (e.g., user.updated, user.deleted)
    # elif event_type == "user.deleted":
    #     # ... handle deletion ...
    #     pass 
    
    else:
        logger.info(f"Received Clerk webhook event type '{event_type}', but no handler is configured.")
        return {"status": "ok", "message": "Event received but not processed."}

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

    # 2. Usage Limit Enforcement (Free plan only)
    if user.plan == "free":
        if user.summariesUsed >= user.summaryLimit:
            logger.warning(f"Usage limit reached for Clerk ID: {user_clerk_id}. Plan: {user.plan}, Used: {user.summariesUsed}, Limit: {user.summaryLimit}")
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Daily summary limit ({user.summaryLimit}) reached for your '{user.plan}' plan.")
        else:
            logger.info(f"Usage within limits for Clerk ID: {user_clerk_id}. Plan: {user.plan}, Used: {user.summariesUsed}, Limit: {user.summaryLimit}")
    else:
        logger.info(f"Premium user bypassing usage limits for Clerk ID: {user_clerk_id}.")

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

        # Track usage only for free users
        if user.plan == "free":
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

# --- Add User Status Endpoint ---
class UserStatusResponse(BaseModel):
    is_pro: bool

@app.get("/api/user/status", response_model=UserStatusResponse)
async def get_user_status(user_id: str = Depends(get_authenticated_user_id)):
    """
    Checks if the authenticated user has an active Premium plan
    (indicated by user.plan == 'premium').
    """
    try:
        # Find user by Clerk ID provided by the authentication dependency
        user = await prisma.user.find_unique(where={"clerkId": user_id})
        if user and user.plan == "premium":
            return UserStatusResponse(is_pro=True)
        else:
            return UserStatusResponse(is_pro=False)
    except Exception as e:
        logger.error(f"Error checking user status for {user_id}: {e}")
        return UserStatusResponse(is_pro=False)
