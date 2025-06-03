console.log("Tildra Background Script Loaded");

// --- Environment Configuration --- START
let EFFECTIVE_API_URL_BASE = 'https://tildra.fly.dev'; // Default to Production
let EFFECTIVE_COOKIE_DOMAIN_URL = 'https://www.tildra.xyz'; // Default to Production
let IS_DEV_MODE = false; // Default to Production

chrome.management.getSelf(function(info) {
  // The logic that previously changed URLs based on info.installType has been removed
  // to ensure production URLs are used when loading the extension unpacked for testing against prod.
  // The EFFECTIVE_API_URL_BASE, EFFECTIVE_COOKIE_DOMAIN_URL, and IS_DEV_MODE 
  // will now consistently use the defaults set at the top of this script.

  // This log will now reflect the top-level defaults.
  if (IS_DEV_MODE) { 
    console.log('[Tildra Background] Running in DEVELOPMENT mode (this indicates an override, check script).');
  } else {
    console.log('[Tildra Background] Running in PRODUCTION mode (using top-level defaults).');
  }
  
  console.log(`[Tildra Background] API URL: ${EFFECTIVE_API_URL_BASE}`);
  console.log(`[Tildra Background] Cookie Domain: ${EFFECTIVE_COOKIE_DOMAIN_URL}`);
  
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

// --- In-memory store for job details detected on tabs ---
let activeJobDetailsByTabId = {};

// Helper function to check if URL is protected
function isProtectedPage(url) {
  if (!url) return true;
  const protectedSchemes = [
    'chrome://',
    'chrome-extension://',
    'chrome-search://',
    'chrome-devtools://',
    'moz-extension://',
    'about:',
    'edge://',
    'opera://',
    'brave://',
    'file:///'
  ];
  return protectedSchemes.some(scheme => url.startsWith(scheme));
}

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

  // Check if this is a protected page
  if (isProtectedPage(tab.url)) {
    console.log("Context menu clicked on protected page:", tab.url);
    // Show a notification instead of trying to inject
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'favicon/favicon-96x96.png',
      title: 'Tildra - Cannot Summarize',
      message: 'Cannot summarize this page. Please navigate to a regular webpage and try again.',
      priority: 1
    });
    return;
  }

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
            
            // Show user-friendly error notification
            let errorMsg = "Cannot access this page for summarization.";
            if (chrome.runtime.lastError.message.includes("Cannot access a chrome:// URL")) {
              errorMsg = "Cannot summarize Chrome internal pages.";
            } else if (chrome.runtime.lastError.message.includes("blocked by the page")) {
              errorMsg = "This page blocks extensions.";
            }
            
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'favicon/favicon-96x96.png',
              title: 'Tildra - Error',
              message: errorMsg,
              priority: 1
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
  console.log("[Tildra Background] Received message:", msg, "from sender:", sender);

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

  // History retrieval request from content script (for dashboard)
  if (msg.action === 'getHistory') {
    console.log('[Tildra Background] Received getHistory request from content script.');
    chrome.storage.local.get(['summaryHistory'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[Tildra Background] Error getting history from storage:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message, history: [] });
      } else {
        const history = result.summaryHistory || [];
        console.log('[Tildra Background] Sending history to content script. Count:', history.length);
        sendResponse({ success: true, history: history });
      }
    });
    return true; // Indicate async response
  }

  // Delete a single summary from history
  if (msg.action === 'deleteSummary' && msg.summaryId) {
    console.log(`[Tildra Background] Received deleteSummary request for ID: ${msg.summaryId}`);
    chrome.storage.local.get(['summaryHistory'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[Tildra Background] Error getting history for deletion:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      let history = result.summaryHistory || [];
      const initialLength = history.length;
      history = history.filter(item => item.id !== msg.summaryId);
      if (history.length < initialLength) {
        chrome.storage.local.set({ 'summaryHistory': history }, () => {
          if (chrome.runtime.lastError) {
            console.error('[Tildra Background] Error saving history after deletion:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log(`[Tildra Background] Summary ${msg.summaryId} deleted. New count: ${history.length}`);
            sendResponse({ success: true });
          }
        });
      } else {
        console.warn(`[Tildra Background] Summary ID ${msg.summaryId} not found for deletion.`);
        sendResponse({ success: false, error: 'Summary not found' });
      }
    });
    return true; // Indicate async response
  }

  // Clear all summaries from history
  if (msg.action === 'clearAllHistory') {
    console.log('[Tildra Background] Received clearAllHistory request.');
    chrome.storage.local.set({ 'summaryHistory': [] }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Tildra Background] Error clearing history:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Tildra Background] All history cleared.');
        sendResponse({ success: true });
      }
    });
    return true; // Indicate async response
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
    const tabId = sender.tab ? sender.tab.id : msg.tabId; // Get tabId from sender or message
    if (!tabId) {
        console.error("[Tildra Background] summarizeAPI: tabId is missing.");
        sendResponse({ success: false, error: "Tab ID missing for summarization request." });
        return false;
    }
    handleSummarizationRequest(msg, tabId) // Pass the whole message which should contain textContent, token, url, title
        .then(summaryData => {
            sendResponse({ success: true, summaryData: summaryData });
        })
        .catch(error => {
            console.error("[Tildra Background] Error in summarizeAPI:", error);
            sendResponse({ success: false, error: error.message || 'Summarization API call failed' });
        });
    return true; // Indicates asynchronous response for summarizeAPI
  }

  if (msg.action === 'getConfig') {
    sendResponse({
      apiUrlBase: EFFECTIVE_API_URL_BASE,
      cookieDomainUrl: EFFECTIVE_COOKIE_DOMAIN_URL,
      isDevMode: IS_DEV_MODE
    });
    return false; // Synchronous response
  }

  // --- NEW JOB COPILOT MESSAGE HANDLERS ---
  if (msg.type === "JOB_PAGE_DETECTED") {
    console.log("[Tildra Background] JOB_PAGE_DETECTED:", msg.data, "Tab ID:", tabId);
    if (sender.tab && sender.tab.id) {
      activeJobDetailsByTabId[sender.tab.id] = {
        ...msg.data,
        timestamp: Date.now()
      };
      chrome.action.setBadgeText({ text: "JOB", tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#007BFF", tabId: sender.tab.id }); // Blue for detected job
      sendResponse({ status: "JOB_DATA_RECEIVED", tabId: sender.tab.id });
    } else {
      console.warn("[Tildra Background] JOB_PAGE_DETECTED but no sender.tab.id found.");
      sendResponse({ status: "ERROR", message: "Missing tab ID for JOB_PAGE_DETECTED." });
    }
    return true; // Indicate async if any further async operations were here (not in this simple case)
  }

  if (msg.type === "GENERIC_APPLICATION_FORM_DETECTED") {
    console.log("[Tildra Background] GENERIC_APPLICATION_FORM_DETECTED on URL:", msg.data.pageUrl, "Tab ID:", sender.tab.id);
    if (sender.tab && sender.tab.id) {
      // Optionally store this or just change badge
      // For now, just a different badge to distinguish
      chrome.action.setBadgeText({ text: "FORM", tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#FFA500", tabId: sender.tab.id }); // Orange for generic form
      sendResponse({ status: "FORM_DATA_RECEIVED", tabId: sender.tab.id });
    } else {
        sendResponse({ status: "ERROR", message: "Missing tab ID for GENERIC_APPLICATION_FORM_DETECTED." });
    }
    return true;
  }

  if (msg.action === "GET_CURRENT_TAB_JOB_DETAILS") {
    const tabId = msg.tabId || (sender.tab ? sender.tab.id : null);
    if (tabId && activeJobDetailsByTabId[tabId]) {
      console.log("[Tildra Background] Sending job details for tab:", tabId, activeJobDetailsByTabId[tabId]);
      sendResponse({ status: "SUCCESS", data: activeJobDetailsByTabId[tabId] });
    } else {
      console.log("[Tildra Background] No job details found for tab:", tabId);
      sendResponse({ status: "NOT_FOUND" });
    }
    return true; // Indicate async if data retrieval was async (not in this simple case)
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
    if (!response.ok) throw new Error(`API error ${response.status}`);
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

// --- Tab Management for cleaning up job details and badges ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Clear job details if the user navigates away from the page where job was detected
  // or if the page reloads and is no longer a job page.
  // A simple check is if the URL changes significantly or on status "complete".
  if (activeJobDetailsByTabId[tabId]) {
    if (changeInfo.url || (changeInfo.status === 'complete' && tab.url !== activeJobDetailsByTabId[tabId].pageUrl)) {
      console.log(`[Tildra Background] Tab ${tabId} updated (URL or status changed). Clearing job details and badge. New URL: ${tab.url}`);
      delete activeJobDetailsByTabId[tabId];
      chrome.action.setBadgeText({ text: "", tabId: tabId });
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (activeJobDetailsByTabId[tabId]) {
    console.log(`[Tildra Background] Tab ${tabId} removed. Clearing job details and badge.`);
    delete activeJobDetailsByTabId[tabId];
    // Badge automatically cleared by Chrome when tab is removed, but good to clear data.
  }
});

console.log("Tildra Background Script Finished Loading"); 