console.log("Tildra Background Script Loaded");

// --- Environment Configuration --- START
let EFFECTIVE_API_URL_BASE = 'https://tildra.fly.dev'; // Default to Production
let EFFECTIVE_COOKIE_DOMAIN_URL = 'https://www.tildra.xyz'; // Default to Production
let IS_DEV_MODE = false; // Default to Production

// Initialize configuration on load
console.log('[Tildra Background] Extension loaded in PRODUCTION mode.');
console.log(`[Tildra Background] API URL: ${EFFECTIVE_API_URL_BASE}`);
console.log(`[Tildra Background] Cookie Domain: ${EFFECTIVE_COOKIE_DOMAIN_URL}`);
// --- Environment Configuration --- END

// --- Request Deduplication --- START
const pendingRequests = new Map(); // Track ongoing requests by content hash

// Generate a simple hash for request deduplication
function generateRequestHash(content, url, title) {
  const combined = `${content?.substring(0, 1000) || ''}|${url || ''}|${title || ''}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
}

// Clean up old pending requests to prevent memory leaks
function cleanupOldRequests() {
  for (const [hash, promise] of pendingRequests.entries()) {
    Promise.race([promise, Promise.resolve('timeout')])
      .then(result => {
        if (result === 'timeout') {
          // Promise is still pending - keep it for now
        }
      })
      .catch(() => {
        // Promise was rejected, safe to remove
        pendingRequests.delete(hash);
      });
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupOldRequests, 5 * 60 * 1000);
// --- Request Deduplication --- END

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

  // Check rate limiting before processing context menu actions
  const rateLimitCheck = shouldRateLimit();
  if (rateLimitCheck.limited) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'favicon/favicon-96x96.png',
      title: 'Tildra - Rate Limited',
      message: 'You\'re making requests too quickly. Please wait before trying again.',
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

  if (msg.action === 'getBgConfig') {
    sendResponse({
      apiUrlBase: EFFECTIVE_API_URL_BASE,
      cookieDomainUrl: EFFECTIVE_COOKIE_DOMAIN_URL,
      isDevMode: IS_DEV_MODE
    });
    return false; // Synchronous response
  }

  // --- NEW JOB COPILOT MESSAGE HANDLERS ---
  if (msg.type === "JOB_PAGE_DETECTED") {
    console.log("[Tildra Background] JOB_PAGE_DETECTED:", msg.data, "Tab ID:", sender.tab?.id);
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

  // NEW: Handle enhanced job tailoring completion
  if (msg.type === "JOB_TAILORING_COMPLETE") {
    console.log("[Tildra Background] JOB_TAILORING_COMPLETE:", msg.data, "Tab ID:", sender.tab?.id);
    if (sender.tab && sender.tab.id) {
      // Store the enhanced job data with tailoring results
      activeJobDetailsByTabId[sender.tab.id] = {
        ...activeJobDetailsByTabId[sender.tab.id], // Keep existing job data
        ...msg.data,
        timestamp: Date.now(),
        tailoringComplete: true
      };
      
      // Update badge to indicate tailoring is complete
      chrome.action.setBadgeText({ text: "✓", tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#00C851", tabId: sender.tab.id }); // Green for completion
      
      // Inform the popup to display the final tailored results
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "JOB_TAILORING_DISPLAY_UPDATE",
        data: activeJobDetailsByTabId[sender.tab.id]
      });
      
      sendResponse({ status: "TAILORING_DATA_RECEIVED", tabId: sender.tab.id });
    } else {
      console.warn("[Tildra Background] JOB_TAILORING_COMPLETE but no sender.tab.id found.");
      sendResponse({ status: "ERROR", message: "Missing tab ID for JOB_TAILORING_COMPLETE." });
    }
    return true;
  }

  // Asynchronous enhancement of job details
  if (msg.type === 'ENHANCE_JOB_DETAILS') {
    console.log('[Tildra Background] Received request to enhance job details:', msg.data);
    
    enhanceJobDetailsWithAPI(msg.data, msg.tabId)
        .then(enhancedData => {
            console.log('[Tildra Background] Enhancement successful, sending tailored data to UI.');
            // This message updates the popup with the full, AI-enhanced job details
            chrome.runtime.sendMessage({
                type: "JOB_TAILORING_DISPLAY_UPDATE",
                data: enhancedData
            });
        })
        .catch(error => {
            console.error('[Tildra Background] Job detail enhancement failed:', error);
            // We can optionally send a failure message, but for now, we'll just log it.
            // The UI will still show the basic info from the initial scrape.
        });

    return true; // Indicates asynchronous response
  }

  if (msg.action === 'TAILOR_RESUME_WITH_NEW_FILE') {
    const { tabId, resumeText } = msg;
    console.log(`[Tildra Background] Received new resume file for tailoring on tab ${tabId}`);

    // We need the existing job details to re-tailor.
    const jobDetails = activeJobDetailsByTabId[tabId];

    if (jobDetails && jobDetails.jobDescription) {
      // Create a payload similar to the original enhancement request
      const enhancementPayload = {
        jobTitle: jobDetails.jobTitle,
        companyName: jobDetails.companyName,
        jobDescription: jobDetails.jobDescription,
        source: jobDetails.source,
        pageUrl: jobDetails.pageUrl,
        // Crucially, add the new resume text to the payload
        resume_text: resumeText,
      };

      console.log("[Tildra Background] Re-running enhancement with new resume.");
      
      // Call the same enhancement function, it should now use the new resume
      enhanceJobDetailsWithAPI(enhancementPayload, tabId);

    } else {
      console.warn(`[Tildra Background] Could not re-tailor resume because no existing job details were found for tab ${tabId}`);
    }
  }

  return false; // unknown message
}); 

// Use dynamic URL for backend
const getApiUrl = () => {
  // Production URL for Chrome Web Store submission
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

async function fetchFromApi(url, method = 'GET', body = null, providedToken = null) {
  // Use provided token first, fallback to getting fresh token from cookies
  let token = providedToken;
  if (!token) {
    token = await getAuthToken();
  }
  
  if (!token) {
    console.warn("No auth token found. API request might fail.");
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
      if (response.status === 401) {
        throw new Error("Authentication failed. Token may be expired. Please log in again.");
      }
      if (response.status === 429) {
        // Enhanced 429 error handling
        const rateLimitError = new Error("Daily summary limit reached! Upgrade for unlimited summaries or wait for reset.");
        rateLimitError.isRateLimit = true;
        rateLimitError.status = 429;
        throw rateLimitError;
      }
      throw new Error(`API error ${response.status}`);
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
  const { content, textContent, url, title, token, summaryLength } = payload;

  // Prefer textContent from Readability if available, otherwise use content (HTML) or fallback
  const textToSummarize = textContent || content;

  if (!textToSummarize && !url) {
    console.error("No content or URL provided for summarization.");
    throw new Error("No content available to summarize.");
  }

  // Generate request hash for deduplication
  const requestHash = generateRequestHash(textToSummarize, url, title);
  
  // Check if this exact request is already pending
  if (pendingRequests.has(requestHash)) {
    console.log(`[Tildra Background] Duplicate request detected for hash: ${requestHash}. Waiting for existing request.`);
    try {
      return await pendingRequests.get(requestHash);
    } catch (error) {
      // If the pending request failed, we'll try again below
      pendingRequests.delete(requestHash);
    }
  }

  // Create promise for this request
  const requestPromise = (async () => {
    try {

      // Notify popup/tab that processing has started
      if (tabId) {
        chrome.runtime.sendMessage({
          type: "SUMMARIZE_START",
          payload: { title: title || "Page" }
        });
      }

      console.log(`Sending content (length: ${textToSummarize?.length}) or URL (${url}) to API...`);
      const apiPayload = {
        article_text: textToSummarize,
        url: url,
        title: title,
        summary_length: summaryLength || 'standard'
      };
      
      const summaryData = await fetchFromApi(SUMMARIZE_API_URL, 'POST', apiPayload, token);

      console.log("API Summary successful:", summaryData);

      // Send successful summary back
      chrome.runtime.sendMessage({ 
        type: "SUMMARIZE_SUCCESS",
        payload: { ...summaryData, originalTitle: title, originalUrl: url }
      });

      return summaryData;

    } catch (error) {
      console.error("Summarization failed:", error);
      
      // Enhanced error handling for different types of errors
      let errorMessage = error.message || "An unknown error occurred during summarization.";
      
      if (error.status === 429) {
        errorMessage = "Daily summary limit reached! Upgrade for unlimited summaries or wait for reset.";
      } else if (error.message?.includes("Authentication")) {
        errorMessage = "Please log in to Tildra to continue using summaries.";
      }
      
      // Send error back
      chrome.runtime.sendMessage({ 
        type: "SUMMARIZE_ERROR",
        payload: { 
          message: errorMessage, 
          originalTitle: title,
          isRateLimit: error.status === 429
        }
      });
      
      throw error;
    } finally {
      // Always clean up pending request
      pendingRequests.delete(requestHash);
    }
  })();

  // Store the promise to prevent duplicate requests
  pendingRequests.set(requestHash, requestPromise);

  return requestPromise;
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

// --- NEW: API Logic for Job Enhancement ---
async function enhanceJobDetailsWithAPI(jobData, tabId) {
    const { jobTitle, companyName, jobDescription, source, pageUrl, resume_text } = jobData;
    
    // Use the correct API endpoint that actually exists
    const DETECT_API_URL = `${API_URL_BASE}/api/job/detect`;
    console.log(`[Tildra Background] Sending to job detection API: ${DETECT_API_URL}`);
    
    const apiPayload = {
        url: pageUrl,
        page_content: jobDescription // Send the scraped content for analysis
    };

    // If a new resume is provided, add it to the payload
    if (resume_text) {
      apiPayload.resume_text = resume_text;
      console.log("[Tildra Background] Attaching new resume text to the API payload.");
    }

    try {
        const token = await getAuthToken();
        const response = await fetchFromApi(DETECT_API_URL, 'POST', apiPayload, token);
        
        console.log("[Tildra Background] API Enhancement successful:", response);
        
        if (response.job_detected && response.job_posting) {
            return {
                jobTitle: response.job_posting.title || jobTitle,
                companyName: response.job_posting.company || companyName,
                jobDescription: response.job_posting.description || jobDescription,
                skills: response.job_posting.skills || [],
                requirements: response.job_posting.requirements || [],
                location: response.job_posting.location,
                source: response.job_posting.source_platform || source,
                pageUrl: pageUrl
            };
        } else {
            // If API doesn't detect a job, return the original scraped data
            return {
                jobTitle,
                companyName,
                jobDescription,
                skills: [],
                requirements: [],
                source,
                pageUrl
            };
        }
    } catch (error) {
        console.error("[Tildra Background] API Enhancement failed:", error);
        // Return original data if API fails
        return {
            jobTitle,
            companyName,
            jobDescription,
            skills: [],
            requirements: [],
            source,
            pageUrl
        };
    }
} 