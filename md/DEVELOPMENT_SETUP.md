# Tildra Development Environment Setup

## ✅ **Environment Configuration Complete**

Your development environment is now properly configured with:

### **🔑 Keys Configured:**
- **Development Clerk App:** `pk_test_YWN0dWFsLW1hcm1vdC0zNi5jbGVyay5hY2NvdW50cy5kZXYk`
- **Production Clerk App:** `pk_live_Y2xlcmsudGlsZHJhLnh5eiQ`
- **Separate webhook secrets** for dev and production

### **🎯 Environment Files Created:**
- `web/.env.development.local` - Development frontend config
- `web/.env.production.local` - Production frontend config  
- `.env.development` - Development backend config
- `.env.production` - Production backend config

## 🚨 **CRITICAL: Complete Clerk Webhook Setup**

### **Step 1: Fix Production Webhook**
In your **Production Clerk App** dashboard:

1. **Go to Webhooks → `https://tildra.fly.dev/clerk-webhook`**
2. **ENABLE the webhook** (currently disabled)
3. **Change Event Subscriptions:**
   - **Remove:** `email.created`, `organization.created`, `organization.deleted`
   - **Add:** `user.created`, `user.updated`, `user.deleted`

### **Step 2: Fix Development Webhook**
In your **Development Clerk App** dashboard:

1. **Go to Webhooks → `https://tildra.fly.dev/clerk-webhook`**
2. **Change URL to:** `http://localhost:8000/clerk-webhook`
3. **Events are already correct:** `user.created`, `user.updated`, `user.deleted` ✅

## 🚀 **Starting Development Environment**

### **Option 1: Easy Start (Recommended)**
```bash
./start-dev.sh
```

### **Option 2: Manual Start**
```bash
# Terminal 1: Backend
cd api
../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --env-file ../.env.development --reload

# Terminal 2: Frontend  
cd web
npm run dev
```

### **Option 3: Backend Only (for API testing)**
```bash
cd api
../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --env-file ../.env.development --reload
```

## 🎯 **Development URLs**
- **Frontend:** http://localhost:3000
- **Backend API:** http://127.0.0.1:8000
- **API Docs:** http://127.0.0.1:8000/docs

## 🧪 **Testing the Setup**

### **Test Authentication:**
1. Go to http://localhost:3000
2. Click "Sign Up" 
3. Create a test account
4. **Should work without domain errors** ✅

### **Test Analytics Dashboard:**
1. Sign in to your account
2. Go to Dashboard
3. Click on "Analytics", "Insights", "Goals" tabs
4. **All new features should load** ✅

### **Test Webhooks:**
1. Sign up with a new user
2. Check backend logs for webhook processing
3. User should be created in database ✅

## 🔧 **Troubleshooting**

### **"Domain restriction" errors:**
- Make sure you're using development keys (`pk_test_...`)
- Check `.env.development.local` has correct keys

### **Webhook failures:**
- Ensure development webhook points to `localhost:8000`
- Check backend is running on port 8000
- Verify webhook secret matches in both places

### **Analytics not loading:**
- Backend must be running on port 8000
- Check API calls in browser network tab
- Verify database connection in backend logs

## 📁 **File Structure**
```
tildra/
├── .env.development          # Backend dev config
├── .env.production          # Backend prod config  
├── start-dev.sh            # Easy startup script
├── web/
│   ├── .env.development.local   # Frontend dev config
│   ├── .env.production.local    # Frontend prod config
│   └── .env.local              # Frontend default (prod)
└── api/
    └── main.py                 # Backend API
```

## 🎊 **What's New - Analytics Features**

Your development environment now includes:

### **📊 Enhanced Dashboard**
- **Overview Tab:** Original dashboard content
- **Analytics Tab:** Time saved metrics, productivity scores, trend charts
- **Insights Tab:** Personalized recommendations and tips  
- **Goals Tab:** Set and track productivity goals

### **🎯 Key Features**
- ⏱️ **Time saved calculations** - Shows real ROI
- 📈 **Productivity scoring** - 0-100 scale with recommendations
- 🔥 **Streak tracking** - Consistent usage gamification
- 📊 **Category analysis** - Breakdown by content type
- 🎯 **Goal setting** - Daily/weekly/monthly targets
- 💡 **Personalized insights** - AI-powered recommendations

## 🚨 **Production Safety**
- ✅ **Separate databases** - Dev users don't affect production
- ✅ **Separate Clerk apps** - No authentication conflicts
- ✅ **Different webhook endpoints** - Clean separation
- ✅ **Production unchanged** - All existing functionality preserved

**Your development environment is ready! 🎉**




https://actual-marmot-36.clerk.accounts.dev/.well-known/jwks.json