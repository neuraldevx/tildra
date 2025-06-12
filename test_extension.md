# Tildra Extension Testing Guide

## Version 1.8.8 - Comprehensive Debug Update

This version includes extensive debugging and improved authentication to fix the summarization issues.

## Setup Instructions

1. **Reload the Extension**
   - Go to `chrome://extensions/`
   - Find "Tildra - AI-Powered Article Summarizer"
   - Click the refresh/reload button
   - Make sure it shows version 1.8.8

2. **Test Authentication** 
   - Open https://tildra.xyz in a new tab
   - Sign in with your account
   - Open browser console (F12) and look for Tildra logs
   - You should see authentication token extraction logs

3. **Test Summarization**
   - Open the `test_page.html` file in a browser
   - Click the Tildra extension icon in your toolbar
   - Click "Summarize This Page"
   - Watch the browser console for debug logs

## What to Look For

### Console Logs
- `[Tildra Debug]` - General debugging information
- `[Tildra Auth]` - Authentication-related logs
- `[Tildra Injector]` - Token extraction logs
- `[Tildra Error]` - Error details

### Expected Behavior
1. Extension should show debug information in console
2. If signed in to tildra.xyz, it should use authenticated API calls
3. If not signed in, it should fall back to development mode with X-User-ID header
4. API calls should complete successfully and display summaries

### Common Issues & Solutions

**"Could not communicate with the page"**
- Reload the page and try again
- Check if content scripts are loading properly
- Look for extension permission issues

**"Authentication failed"**
- Make sure you're signed in to tildra.xyz
- Check console for token extraction logs
- Try refreshing the tildra.xyz tab

**API timeout errors**
- Wait for the full 90-second timeout
- Check your internet connection
- Verify API endpoint is reachable

## Debug Information

The extension now provides comprehensive debugging:
- All API calls are logged with request/response details
- Authentication attempts are tracked
- Content extraction is monitored
- Error details are preserved

Check the browser console for detailed logs when testing.

## Fallback Modes

1. **Authenticated Mode**: Uses Bearer token from tildra.xyz
2. **Development Mode**: Uses X-User-ID header for testing
3. **Error Recovery**: Clear token storage and retry on auth failures

The extension should work in development mode even without authentication, using the hardcoded user ID for API testing. 