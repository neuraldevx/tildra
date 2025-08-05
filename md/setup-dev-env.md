# Tildra Local Development Setup

## Problem
Production Clerk keys only work with `tildra.xyz` domain, causing authentication failures on `localhost:3000`.

## Solution: Separate Development Environment

### 1. Create Clerk Development Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click "Add Application" 
3. Name: `Tildra Development`
4. Select same auth methods as production (Email, Google, etc.)
5. **Copy the development keys:**
   ```
   Publishable Key: pk_test_... 
   Secret Key: sk_test_...
   ```

### 2. Update Development Environment File

Replace the placeholder keys in `web/.env.development.local`:

```bash
# Replace these with your actual development keys:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_[YOUR_ACTUAL_DEV_KEY]
CLERK_SECRET_KEY=sk_test_[YOUR_ACTUAL_DEV_KEY]
```

### 3. Configure Development Webhooks

In your **development Clerk app** (not production):

1. Go to "Webhooks" section
2. Add endpoint: `http://localhost:8000/clerk-webhook`
3. Select events:
   - `user.created`
   - `user.updated` 
   - `user.deleted`
4. Copy webhook secret and update `.env.development.local`:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_[YOUR_DEV_WEBHOOK_SECRET]
   ```

### 4. Development Database (Optional)

**Option A: Use Production Database**
- Development users will be in same database as production
- Prefix dev usernames with "DEV_" to identify them

**Option B: Separate Development Database** 
- Create separate Supabase project for development
- Update `DATABASE_URL` in development environment

### 5. Start Development Environment

```bash
# Terminal 1: Start Backend
cd api
../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 2: Start Frontend  
cd web
npm run dev
```

### 6. Chrome Extension Development

The extension needs to connect to local backend:

1. Update `extension/popup.js` - add localhost to allowed origins
2. Or use the existing extension-package with production settings for now

## Expected Result

- ✅ Authentication works on `localhost:3000`
- ✅ Separate development users from production
- ✅ Local API calls work without CORS issues
- ✅ Production environment remains untouched

## Troubleshooting

**If you still get domain errors:**
1. Double-check you're using `pk_test_` keys (not `pk_live_`)
2. Verify `.env.development.local` is being loaded
3. Clear browser cache and reload

**If webhooks fail:**
1. Use ngrok for webhook testing: `ngrok http 8000`
2. Update Clerk webhook URL to ngrok URL
3. Test webhook delivery in Clerk dashboard