console.log("Tildra Background Script Loaded");

// --- Environment Configuration --- START
let EFFECTIVE_API_URL_BASE = 'https://tildra.fly.dev'; // Default to Production
let EFFECTIVE_COOKIE_DOMAIN_URL = 'https://www.tildra.xyz'; // Default to Production
let IS_DEV_MODE = false;

chrome.management.getSelf(function(info) {
  if (info.installType === 'development') {
    EFFECTIVE_API_URL_BASE = 'http://127.0.0.1:8000';
    EFFECTIVE_COOKIE_DOMAIN_URL = 'http://localhost:3000';
    IS_DEV_MODE = true;
    console.log('[Tildra Background] Running in DEVELOPMENT mode.');
  } else {
    console.log('[Tildra Background] Running in PRODUCTION mode.');
  }
  // Re-initialize any constants that depend on these, if necessary, or use these vars directly.
});
// --- Environment Configuration --- END

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
  chrome.contextMenus.create({
    id: "summarizePage",
    title: "Summarize with Tildra",
    contexts: ["page"],
  });
});

// Constants for Clerk session cookie retrieval
// --- CHANGE FOR LOCAL TESTING --- 
// const COOKIE_DOMAIN_URL = 'https://www.tildra.xyz'; // PRODUCTION
// const COOKIE_DOMAIN_URL = 'http://localhost:3000'; // LOCAL DEV - This will now be set by EFFECTIVE_COOKIE_DOMAIN_URL
// --- END CHANGE --- 
const COOKIE_NAME = '__session';

// Constants for backend API summarization
// --- ENSURE THIS POINTS TO YOUR DEPLOYED OR LOCAL BACKEND AS NEEDED ---
// const API_URL = 'http://127.0.0.1:8000/summarize'; // LOCAL DEV - This will now be derived from EFFECTIVE_API_URL_BASE
// const API_URL = 'https://tildra.fly.dev'; // PRODUCTION - If testing against deployed API
// --- END ENSURE ---

// Constants for history storage
const MAX_HISTORY_ITEMS = 100;

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
  } else if (info.menuItemId === "summarizePage" && tab && tab.id) {
    console.log("Context menu clicked for tab:", tab.id);
    // Send message to content script to get page content first
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // This function runs in the content script's context
            // Attempt to grab basic info if Readability hasn't loaded yet
            // This is a basic fallback
            function getBasicPageInfo() {
                return {
                    title: document.title,
                    textContent: document.body.innerText.substring(0, 10000), // Limit initial grab
                    url: window.location.href
                }
            }
            return getBasicPageInfo();
        }
    }, (injectionResults) => {
        if (chrome.runtime.lastError) {
            console.error("Scripting error:", chrome.runtime.lastError.message);
            chrome.runtime.sendMessage({ // Send error back to popup if open
                type: "SUMMARIZE_ERROR",
                payload: { message: "Error accessing page content." }
            });
            return;
        }
        for (const frameResult of injectionResults) {
            if (frameResult.result) {
                console.log("Got basic page info:", frameResult.result.title);
                handleSummarizationRequest(frameResult.result, tab.id);
                break; // Use the first successful result
            }
        }
    });
  }
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
    chrome.tabs.query({ url: `${EFFECTIVE_COOKIE_DOMAIN_URL}/*`, active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0 && tabs[0].id) {
        const activeTabId = tabs[0].id;
        console.log(`[Tildra Background] Found active Tildra tab (${activeTabId}) for domain ${EFFECTIVE_COOKIE_DOMAIN_URL}, sending getFreshClerkToken message...`);
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
    chrome.cookies.get({ url: EFFECTIVE_COOKIE_DOMAIN_URL, name: COOKIE_NAME }, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('[Tildra Background] Fallback cookie.get error:', chrome.runtime.lastError.message);
        callback({ success: false, error: `Cookie retrieval error: ${chrome.runtime.lastError.message}` });
      } else if (!cookie) {
        console.warn('[Tildra Background] Fallback cookie not found for', EFFECTIVE_COOKIE_DOMAIN_URL, COOKIE_NAME);
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
    const url = msg.url;
    const title = msg.title;

    if (!token) {
      console.error('Tildra (background): No token provided in summarizeAPI message.');
      sendResponse({ success: false, error: 'Authentication token missing' });
      return true;
    }

    // Construct payload including URL and Title
    const requestPayload = {
      article_text: textContent,
      url: url,       // Include URL
      title: title    // Include Title
    };

    fetch(`${EFFECTIVE_API_URL_BASE}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      // Use the full payload
      body: JSON.stringify(requestPayload)
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

  if (msg.action === 'getConfig') {
    sendResponse({
      apiUrlBase: EFFECTIVE_API_URL_BASE,
      cookieDomainUrl: EFFECTIVE_COOKIE_DOMAIN_URL,
      isDevMode: IS_DEV_MODE
    });
    return false; // Synchronous response
  }

  return false; // unknown message
}); 

// Use dynamic URL for backend
const getApiUrl = () => {
  // In production, chrome.runtime.id should be defined
  // You might need to adjust this logic based on how you deploy
  // if (chrome.runtime.id) {
  //   return 'https://tildra.fly.dev'; // Production URL
  // } else {
  //   return 'http://localhost:8000'; // Development URL
  // }
  // For simplicity, always using the deployed URL for now:
  return 'https://tildra.fly.dev';
};

const API_URL_BASE = getApiUrl();
const SUMMARIZE_API_URL = `${API_URL_BASE}/summarize`;
const USER_STATUS_API_URL = `${API_URL_BASE}/api/user/status`;

// --- Cookie Management --- 

async function getClerkSessionCookie() {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url: EFFECTIVE_COOKIE_DOMAIN_URL, name: COOKIE_NAME }, (cookie) => {
      if (chrome.runtime.lastError) {
        // Handle error, e.g., cookie not found or permissions issue
        console.warn("Could not get cookie:", chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(cookie);
      }
    });
  });
}

async function getAuthToken() {
  const cookie = await getClerkSessionCookie();
  return cookie ? cookie.value : null;
}

// --- API Interaction --- 

async function fetchFromApi(url, method = 'GET', body = null) {
  const token = await getAuthToken();
  if (!token) {
    console.warn("No auth token found. API request might fail.");
    // Depending on the endpoint, you might want to throw an error or proceed
    // For summarization, we require auth, so throw an error.
    if (url.includes('/summarize')) { 
      throw new Error("Authentication required. Please log in on Tildra.");
    }
  }

  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method: method,
    headers: headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      console.error(`API Error ${response.status}:`, errorData);
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch API error:', error);
    throw error; // Re-throw the error to be caught by the caller
  }
}

// --- Summarization Logic --- 

async function handleSummarizationRequest(payload, tabId) {
  console.log("Handling summarization request for tab:", tabId);
  const { content, textContent, url, title } = payload;

  // Prefer textContent from Readability if available, otherwise use content (HTML) or fallback
  const textToSummarize = textContent || content; // Assuming `content` might be raw HTML if textContent failed

  if (!textToSummarize && !url) {
    console.error("No content or URL provided for summarization.");
    throw new Error("No content available to summarize.");
  }

  // Notify popup/tab that processing has started
  if (tabId) {
      chrome.runtime.sendMessage({ // Send to popup/potentially other listeners
          type: "SUMMARIZE_START",
          payload: { title: title || "Page" }
      });
  }

  try {
    console.log(`Sending content (length: ${textToSummarize?.length}) or URL (${url}) to API...`);
    const apiPayload = {
      article_text: textToSummarize, // Renamed field as expected by API
      url: url,                  // Include URL
      title: title               // Include Title
    };
    const summaryData = await fetchFromApi(SUMMARIZE_API_URL, 'POST', apiPayload);

    console.log("API Summary successful:", summaryData);

    // Send successful summary back
    chrome.runtime.sendMessage({ 
        type: "SUMMARIZE_SUCCESS",
        payload: { ...summaryData, originalTitle: title, originalUrl: url }
    });

    return summaryData; // Resolve the promise for the original caller

  } catch (error) {
    console.error("Summarization failed:", error);
    // Send error back
    chrome.runtime.sendMessage({ 
        type: "SUMMARIZE_ERROR",
        payload: { message: error.message || "An unknown error occurred during summarization.", originalTitle: title }
    });
    throw error; // Reject the promise for the original caller
  }
}

console.log("Tildra Background Script Finished Loading"); 