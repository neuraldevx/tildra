# Extension Fixes Testing Guide

## Issues Fixed

### 1. ✅ Message Port Communication Error
**Problem**: "The message port closed before a response was received"
**Fix**: Added timeout handling and better error detection

### 2. ✅ Content Script Communication Failure  
**Problem**: "Could not establish connection. Receiving end does not exist"
**Fix**: Added content script availability checking and automatic injection

### 3. ✅ Rate Limiting Error Handling
**Problem**: Poor UX for API 429 errors
**Fix**: Better error messages and upgrade CTA display

### 4. ✅ Background Script Disconnection
**Problem**: Extension context issues causing communication failures
**Fix**: Improved error handling and reconnection logic

## Testing Steps

### Test 1: Summarization with Timeout Handling
1. Go to a news article (e.g., https://www.bbc.com/news)
2. Open the extension popup
3. Click "Summarize This Page"
4. **Expected**: Should show proper loading states and handle timeouts gracefully

### Test 2: Rate Limiting Error
1. Use the extension until you hit the daily limit
2. Try to summarize another page
3. **Expected**: Should show clear error message about daily limit and upgrade CTA

### Test 3: Job Detection Content Script
1. Go to a job posting page (e.g., LinkedIn Jobs)
2. Open extension popup, go to Job Copilot tab
3. Click "Scan for Jobs" button
4. **Expected**: Should either detect job or show clear error message

### Test 4: Manual Job Detection on Non-Job Pages
1. Go to a regular webpage (not a job posting)
2. Open extension popup, go to Job Copilot tab  
3. Click "Scan for Jobs" button
4. **Expected**: Should show "No job details found" message

### Test 5: Content Script Auto-Injection
1. Go to a fresh page where content script isn't loaded
2. Try manual job detection
3. **Expected**: Should automatically inject content script and try detection

## Console Messages to Watch For

### ✅ Good Messages:
```
[Tildra Background] Handling summarizeAPI request
[Tildra Popup] Content script not available, injecting...
[Tildra Background] API Enhancement successful for tab: {tabId}
```

### ❌ Fixed Error Messages:
```
// These should no longer appear:
BG message error: The message port closed before a response was received
Could not establish connection. Receiving end does not exist
Uncaught (in promise) Error: Could not establish connection
```

### ✅ New Better Error Messages:
```
Extension communication error. Please reload the page and try again.
You've reached your daily summary limit. Upgrade to get more summaries...
Content script not available. Please refresh the page and try again.
Request timed out. Please try again.
```

## Rate Limiting Test

If you want to test rate limiting without hitting actual limits:

1. Temporarily modify `api/main.py` to set a very low limit:
```python
# In the user creation/update logic, set:
summaryLimit: 1  # Instead of normal limit
```

2. Test the extension behavior when hitting limits
3. Revert the change

## Browser Console Commands

### Check if content script is loaded:
```javascript
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {action: 'ping'}, (response) => {
    console.log('Content script available:', !!response);
  });
});
```

### Check background script status:
```javascript
chrome.runtime.sendMessage({action: 'getBgConfig'}, (response) => {
  console.log('Background script config:', response);
});
```

## Known Limitations

1. **Protected Pages**: Chrome internal pages, PDFs, etc. cannot be summarized
2. **Content Script Blocking**: Some websites may block content script injection
3. **Rate Limiting**: Daily limits are enforced by the API
4. **Authentication**: Users must be logged into tildra.xyz

## Success Criteria

- ✅ No "message port closed" errors
- ✅ No "receiving end does not exist" errors  
- ✅ Clear error messages for rate limiting
- ✅ Automatic content script injection works
- ✅ Timeout handling prevents indefinite loading
- ✅ Better UX for all error scenarios

The extension should now handle communication errors gracefully and provide better user feedback for all error conditions. 