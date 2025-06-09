# Tildra Chrome Extension Testing Guide

## 🚀 Quick Setup & Testing

### 1. Install the Updated Extension

1. **Open Chrome and go to Extensions**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Load the updated extension**:
   - Click "Load unpacked"
   - Select the `/extension` folder from your project
   - OR use the packaged version: `tildra-job-copilot-v1.2.0.zip`

3. **Verify installation**:
   - You should see "Tildra: AI Summarizer & Job Copilot v1.2.0"
   - Pin the extension to your toolbar

### 2. Backend Setup

1. **Ensure the API is running**:
   ```bash
   cd api
   python main.py
   ```
   - Should see: "Uvicorn running on http://127.0.0.1:8000"

2. **Verify API endpoints**:
   ```bash
   python test_job_copilot.py
   ```
   - All 3 tests should pass ✅

## 🧪 Testing Scenarios

### Test 1: Job Detection on LinkedIn

1. **Navigate to LinkedIn Jobs**:
   - Go to: `https://www.linkedin.com/jobs/search/`
   - Search for any job (e.g., "Software Engineer")
   - Click on a specific job posting

2. **Expected Behavior**:
   - Extension badge should change to "JOB" (blue background)
   - Wait 2-3 seconds for processing
   - Badge should change to "✓" (green background) when complete

3. **Open Extension Popup**:
   - Click the Tildra extension icon
   - Should automatically switch to "Job Copilot" tab
   - Should show detected job details

### Test 2: Job Detection on Indeed

1. **Navigate to Indeed**:
   - Go to: `https://www.indeed.com/`
   - Search for jobs and click on a posting

2. **Expected Behavior**:
   - Same badge behavior as LinkedIn
   - Extension should detect job details
   - Popup should show job copilot interface

### Test 3: Manual Job Copilot Testing

1. **Test with Sample Data**:
   - Go to any non-job page
   - Open extension popup
   - Click "Job Copilot" tab
   - Should show "No job detected" message

2. **Simulate Job Detection**:
   - In browser console, run:
   ```javascript
   chrome.runtime.sendMessage({
     type: "JOB_TAILORING_COMPLETE",
     data: {
       jobDetails: {
         title: "Test Software Engineer",
         company: "Test Company",
         location: "Remote",
         skills: ["JavaScript", "React", "Node.js"]
       },
       tailoredResume: {
         sections: {
           summary: "Experienced software engineer...",
           experience: ["Lead developer at..."],
           skills: ["JavaScript", "React", "Node.js", "Python"]
         },
         optimizationScore: 85,
         keywordMatches: ["JavaScript", "React"],
         improvementSuggestions: ["Add more React experience"]
       }
     }
   });
   ```

## 🔍 Debugging Steps

### Check Console Logs

1. **Extension Console**:
   - Go to `chrome://extensions/`
   - Click "service worker" under Tildra extension
   - Check for any errors in console

2. **Content Script Console**:
   - On a job page, open DevTools (F12)
   - Check console for Tildra content script logs
   - Look for: `[Tildra Content] Job detected:` messages

3. **Popup Console**:
   - Right-click extension popup → "Inspect"
   - Check for any JavaScript errors

### Verify API Communication

1. **Check Network Tab**:
   - Open DevTools → Network tab
   - Reload job page
   - Look for requests to `localhost:8000/api/job/detect`

2. **Test API Manually**:
   ```bash
   curl -X POST "http://localhost:8000/api/job/detect" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.linkedin.com/jobs/view/123", "content": "Software Engineer job..."}'
   ```

### Common Issues & Fixes

#### Issue: Badge doesn't update
- **Solution**: Check if content script is injected
- Verify job board URLs match in `manifest.json`

#### Issue: API requests fail
- **Solution**: Ensure backend is running on port 8000
- Check CORS settings in `api/main.py`

#### Issue: No job detected
- **Solution**: Check content script console
- Verify URL patterns in content script

#### Issue: Popup doesn't show job data
- **Solution**: Check message passing between scripts
- Verify storage in background script

## 📋 Test Checklist

- [ ] Extension loads without errors
- [ ] Badge updates on job pages (JOB → ✓)
- [ ] Job copilot tab appears in popup
- [ ] Job details display correctly
- [ ] Resume tailoring shows optimization score
- [ ] Download/copy buttons work
- [ ] Cover letter generation works
- [ ] API communication successful
- [ ] Works on multiple job boards

## 🎯 Success Criteria

The extension is working correctly if:

1. **Job Detection**: Badge changes to "JOB" then "✓" on job pages
2. **UI Switch**: Popup automatically shows Job Copilot tab
3. **Data Display**: Job details and tailored resume appear
4. **Interactions**: All buttons (download, copy, generate) work
5. **No Errors**: Console shows no JavaScript errors

## 🚨 If Something Doesn't Work

1. **Reload the extension**: Go to chrome://extensions → click reload
2. **Clear storage**: Chrome DevTools → Application → Storage → Clear
3. **Restart Chrome**: Sometimes needed for manifest changes
4. **Check permissions**: Ensure all job board sites are allowed

Let me know what specific behavior you're seeing and I can help debug! 🔧 