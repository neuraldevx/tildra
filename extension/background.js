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
const COOKIE_DOMAIN_URL = 'https://www.tildra.xyz';
const COOKIE_NAME = '__session';

// Constants for backend API summarization
const API_URL = 'https://snipsummary.fly.dev/summarize';

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

  // Session token request
  if (msg.action === 'getSessionToken') {
    console.log('[Tildra Background] Received getSessionToken request');
    chrome.cookies.get({ url: COOKIE_DOMAIN_URL, name: COOKIE_NAME }, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('[Tildra Background] cookie.get error:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: `Cookie retrieval error: ${chrome.runtime.lastError.message}` });
      } else if (!cookie) {
        console.warn('[Tildra Background] Cookie not found for', COOKIE_DOMAIN_URL, COOKIE_NAME);
        sendResponse({ success: false, error: 'Cookie not found (User might not be logged in)' });
      } else {
        console.log('[Tildra Background] Cookie found! Token starts with:', cookie.value.substring(0, 10) + '...');
        sendResponse({ success: true, token: cookie.value });
      }
    });
    return true;
  }

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
      .catch(async errorOrResponse => { // Catch network errors or the rejected response object
        let errorMessage = 'Failed to fetch summary: Unknown error'; // Default message
        let isExpiredToken = false;

        if (errorOrResponse instanceof Response) { // Check if it's the Response object we rejected
          const response = errorOrResponse;
          try {
            // Only try to parse JSON if there's likely a body
            if (response.body) { 
                const errorData = await response.json(); // Try parsing the error body
                let detail = (errorData && errorData.detail) ? errorData.detail : null;

                // Check for specific error messages from the API
                if (response.status === 401 && detail && detail.toLowerCase().includes("token has expired")) {
                    errorMessage = "Token has expired"; // Specific internal message
                    isExpiredToken = true;
                } else if (detail) {
                    // Use API detail if available and not the specific expired token case
                    errorMessage = detail;
                } else {
                   // Fallback if no detail
                   errorMessage = `Request failed: ${response.statusText} (Status: ${response.status})`;
                }
                console.error(`[Tildra Background] API Error Response (${response.status}):`, errorData || response.statusText);
            } else {
                 errorMessage = `Request failed: ${response.statusText} (Status: ${response.status})`;
                 console.error(`[Tildra Background] API Error Response (${response.status}): No response body`);
            }
          } catch (parseError) { // Handle cases where the error body wasn't valid JSON
              errorMessage = `Request failed: ${response.statusText} (Status: ${response.status})`;
              console.error("[Tildra Background] Failed to parse JSON error response:", parseError, response.statusText);
          }
        } else if (errorOrResponse instanceof Error) { // Handle network errors or errors thrown earlier
          errorMessage = errorOrResponse.message;
          console.error('[Tildra Background] Network/internal error:', errorOrResponse);
        }

        // Send the potentially specific error message back
        sendResponse({ success: false, error: errorMessage, expired: isExpiredToken });
      });
    return true; // Indicate async response expected
  }

  return false; // unknown message
}); 