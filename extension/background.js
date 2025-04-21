// Register context menu items on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize-selection",
    title: "Summarize with Tildra",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "summarize-link",
    title: "Summarize with Tildra",
    contexts: ["link"]
  });
});

// Constants for Clerk session cookie retrieval
// --- CHANGE FOR LOCAL TESTING --- 
// const COOKIE_DOMAIN_URL = 'https://www.tildra.xyz'; 
const COOKIE_DOMAIN_URL = 'http://localhost:3000'; 
// --- END CHANGE --- 
const COOKIE_NAME = '__session';

// Constants for backend API summarization
// --- ENSURE THIS POINTS TO YOUR DEPLOYED OR LOCAL BACKEND AS NEEDED ---
// const API_URL = 'http://127.0.0.1:8000/summarize'; // If testing API locally
const API_URL = 'https://snipsummary.fly.dev/summarize'; // If testing against deployed API
// --- END ENSURE ---

// Constants for history storage
const MAX_HISTORY_ITEMS = 20;

// Store a summary in history
function addToSummaryHistory(summaryData, pageInfo = {}) {
  // Get current date/time
  console.log('[Tildra History] Adding to history:', summaryData, pageInfo);
  const timestamp = new Date().toISOString();
  
  // Create history entry
  const historyEntry = {
    id: 'summary_' + Date.now(),
    timestamp,
    title: pageInfo.title || 'Untitled Page',
    url: pageInfo.url || '',
    summary: summaryData.tldr,
    keyPoints: summaryData.key_points
  };
  
  // Get existing history and add the new entry
  chrome.storage.local.get(['summaryHistory'], (result) => {
    console.log('[Tildra History] Current history:', result.summaryHistory);
    const history = Array.isArray(result.summaryHistory) 
      ? result.summaryHistory 
      : [];
    
    // Add new entry at the beginning
    history.unshift(historyEntry);
    
    // Limit history size
    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS;
    }
    
    // Save updated history
    chrome.storage.local.set({ 'summaryHistory': history }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Tildra History] Error saving to storage:', chrome.runtime.lastError);
      } else {
        console.log('[Tildra History] Saved successfully. New count:', history.length);
      }
      console.log('Summary saved to history:', historyEntry.title);
    });
  });
}

// Handle clicks on our context menu items
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  let payload = null;
  if (info.menuItemId === "summarize-selection" && info.selectionText) {
    payload = info.selectionText;
  } else if (info.menuItemId === "summarize-link" && info.linkUrl) {
    // For link summaries, send the URL and let content script fetch/parse
    payload = info.linkUrl;
  }
  if (!payload) return;

  // Fallback: send message or inject scripts if no listener
  const sendToContent = () => {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "summarizeContext", content: payload },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Tildra (background): No content script listener on tab", tab.id, ":", chrome.runtime.lastError.message
          );
          // Inject content scripts and retry
          chrome.scripting.executeScript(
            { target: { tabId: tab.id }, files: ["readability.js", "content.js"] },
            () => {
              console.log(
                "Tildra (background): Content scripts injected, retrying summarizeContext"
              );
              chrome.tabs.sendMessage(tab.id, { action: "summarizeContext", content: payload });
            }
          );
        } else {
          console.log(
            "Tildra (background): summarizeContext message delivered to tab", tab.id
          );
        }
      }
    );
  };

  sendToContent();
});

// Commented out old message listeners
// chrome.runtime.onMessage.addListener((msg, sender) => { ... });
// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => { ... });

// Unified message listener for Tildra extension
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Notification request
  if (msg.action === 'showSummaryNotification' && msg.summary) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon128.png',
      title: 'Tildra Summary',
      message: msg.summary.substring(0, 200) + '...',
      priority: 0
    });
    return false;
  }

  // --- Updated Session token request ---
  if (msg.action === 'getSessionToken') {
    console.log('[Tildra Background] Received getSessionToken request');

    // 1. Try getting token from active tildra.xyz tab
    chrome.tabs.query({ url: `${COOKIE_DOMAIN_URL}/*`, active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0 && tabs[0].id) {
        const activeTabId = tabs[0].id;
        console.log(`[Tildra Background] Found active Tildra tab (${activeTabId}), sending getFreshClerkToken message...`);
        chrome.tabs.sendMessage(activeTabId, { action: 'getFreshClerkToken' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn(`[Tildra Background] Error sending message to tab ${activeTabId}: ${chrome.runtime.lastError.message}. Falling back to cookie.`);
            // Fallback to cookie method
            getTokenFromCookie(sendResponse);
          } else if (response && response.success && response.token) {
            console.log('[Tildra Background] Received fresh token from active tab.');
            sendResponse({ success: true, token: response.token });
          } else {
            console.warn('[Tildra Background] Failed to get fresh token from tab (response error or no token): ', response?.error || 'Unknown tab error');
            // Fallback to cookie method
            getTokenFromCookie(sendResponse);
          }
        });
      } else {
        console.log('[Tildra Background] No active Tildra tab found. Falling back to cookie method.');
        // Fallback to cookie method if no active tab
        getTokenFromCookie(sendResponse);
      }
    });

    return true; // Indicate async response will be sent
  }
  // --- End Updated Session token request ---

  // --- Helper function for cookie fallback ---
  function getTokenFromCookie(callback) {
    console.log('[Tildra Background] Attempting fallback: Reading cookie...');
    chrome.cookies.get({ url: COOKIE_DOMAIN_URL, name: COOKIE_NAME }, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('[Tildra Background] Fallback cookie.get error:', chrome.runtime.lastError.message);
        callback({ success: false, error: `Cookie retrieval error: ${chrome.runtime.lastError.message}` });
      } else if (!cookie) {
        console.warn('[Tildra Background] Fallback cookie not found for', COOKIE_DOMAIN_URL, COOKIE_NAME);
        callback({ success: false, error: 'Cookie not found (User might not be logged in)' });
      } else {
        console.log('[Tildra Background] Fallback cookie found! Token starts with:', cookie.value.substring(0, 10) + '...');
        callback({ success: true, token: cookie.value });
      }
    });
  }
  // --- End Helper Function ---

  // Backend summarization request
  if (msg.action === 'summarizeAPI') {
    const textContent = msg.textContent;
    const token = msg.token;

    if (!token) {
      console.error('Tildra (background): No token provided in summarizeAPI message.');
      sendResponse({ success: false, error: 'Authentication token missing' });
      return true;
    }

    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ article_text: textContent })
    })
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Store summary in history
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs && tabs[0]) {
            addToSummaryHistory(data, {
              title: tabs[0].title,
              url: tabs[0].url
            });
          } else {
            addToSummaryHistory(data);
          }
        });
        
        sendResponse({ success: true, summaryData: data });
      })
      .catch(error => { // Catch network errors or the rejected Error object
        let errorMessage = 'Failed to fetch summary: Unknown error'; // Default message
        let isExpiredToken = false;
        let isUsageLimit = false; // Flag for usage limit

        console.warn('[Tildra Background] API call failed:', error);

        if (error instanceof Error && error.message.startsWith('API error')) {
          // Extract status code from the error message (e.g., "API error 429")
          const match = error.message.match(/API error (\d+)/);
          const status = match ? parseInt(match[1], 10) : null;

          if (status === 429) {
            errorMessage = "You've reached your daily free summary limit. Please upgrade for unlimited use.";
            isUsageLimit = true;
            console.warn('[Tildra Background] API Usage Limit Reached (429)');
          } else if (status === 401 || status === 403) {
            // Attempt to determine if it's an expired token - this might need refinement
            // depending on the exact error message from your 401/403 responses.
            // For now, assume any 401/403 might mean expired session.
            errorMessage = "Authentication failed. Please log in again on tildra.xyz.";
            isExpiredToken = true; 
            console.warn(`[Tildra Background] API Authentication Error (${status})`);
          } else {
            // Generic API error with status if available
            errorMessage = status ? `API error (${status})` : error.message;
          }
        } else if (error instanceof Error) { // Handle network errors or other JS errors
          errorMessage = `Network or script error: ${error.message}`;
        } else { // Handle unexpected error types
          errorMessage = `Unexpected error occurred: ${String(error)}`;
        }
        
        console.error('[Tildra Background] Summarization error:', errorMessage);
        sendResponse({ 
            success: false, 
            error: errorMessage, 
            isExpiredToken: isExpiredToken,
            isUsageLimit: isUsageLimit // Include the flag in the response
        }); 
      });
    return true; // Indicate async response expected
  }

  return false; // unknown message
}); 