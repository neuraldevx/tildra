console.log("Tildra Background Script Loaded");

// --- Environment Configuration ---
const EFFECTIVE_API_URL_BASE = 'https://tildra.fly.dev';
const EFFECTIVE_COOKIE_DOMAIN_URL = 'https://www.tildra.xyz';
const COOKIE_NAME = '__session';
const SUMMARIZE_API_URL = `${EFFECTIVE_API_URL_BASE}/summarize`;

console.log(`[Tildra Background] API URL: ${EFFECTIVE_API_URL_BASE}`);
console.log(`[Tildra Background] Cookie Domain: ${EFFECTIVE_COOKIE_DOMAIN_URL}`);

// --- Request Deduplication ---
const pendingRequests = new Map();

function generateRequestHash(content, url, title) {
  const combined = `${content?.substring(0, 1000) || ''}|${url || ''}|${title || ''}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString();
}

// --- Context Menus ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizePage",
    title: "Summarize Page with Tildra",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarizePage" && tab?.id) {
    // The popup will handle everything, but we could trigger it here if needed.
    // For now, the user can just click the extension icon.
    console.log("Context menu clicked for tab:", tab.id);
  }
});


// --- Message Listener ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("[Tildra Background] Received message:", msg);

  if (msg.action === 'summarizeAPI') {
    const tabId = sender.tab ? sender.tab.id : msg.tabId;
    if (!tabId) {
        console.error("[Tildra Background] summarizeAPI: tabId is missing.");
        sendResponse({ success: false, error: "Tab ID missing." });
        return false;
    }
    
    handleSummarizationRequest(msg, tabId)
        .then(summaryData => {
            sendResponse({ success: true, summaryData: summaryData });
        })
        .catch(error => {
            console.error("[Tildra Background] Error in summarizeAPI:", error);
            sendResponse({ success: false, error: error.message || 'API call failed' });
        });
    return true; // Indicates asynchronous response.
  }
  
  return false;
});


// --- Cookie Management ---
async function getAuthToken() {
  const cookie = await chrome.cookies.get({ url: EFFECTIVE_COOKIE_DOMAIN_URL, name: COOKIE_NAME });
  return cookie ? cookie.value : null;
}

// --- API Interaction ---
async function fetchFromApi(url, method = 'GET', body = null, providedToken = null) {
  let token = providedToken;
  if (!token) {
    token = await getAuthToken();
  }
  
  if (!token && url.includes('/summarize')) { 
    throw new Error("Authentication required. Please log in on Tildra.");
  }

  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `API error ${response.status}` }));
        console.error("API Error Response:", errorData);
        if (response.status === 401) {
            throw new Error("Authentication failed. Please log in again.");
        }
        if (response.status === 429) {
            throw new Error("Daily summary limit reached!");
        }
        throw new Error(errorData.detail || `API error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Request timed out after 35 seconds. Please try again.");
    }
    console.error('Fetch API error:', error);
    throw error;
  }
}

// --- Summarization Logic ---
async function handleSummarizationRequest(payload, tabId) {
  console.log("Handling summarization request for tab:", tabId);
  const { textContent, url, title, token, summaryLength } = payload;

  const requestHash = generateRequestHash(textContent, url, title);
  if (pendingRequests.has(requestHash)) {
    console.log(`[Tildra Background] Duplicate request detected. Waiting.`);
    return pendingRequests.get(requestHash);
  }

  const requestPromise = (async () => {
    try {
      console.log(`Sending content (length: ${textContent?.length}) to API...`);
      const apiPayload = {
        article_text: textContent,
        url: url,
        title: title,
        summaryLength: summaryLength || 'standard'
      };
      
      const summaryData = await fetchFromApi(SUMMARIZE_API_URL, 'POST', apiPayload, token);
      console.log("API Summary successful:", summaryData);
      return summaryData;
    } catch (error) {
      console.error("Summarization failed:", error);
      throw error;
    } finally {
      pendingRequests.delete(requestHash);
    }
  })();

  pendingRequests.set(requestHash, requestPromise);
  return requestPromise;
}

console.log("Tildra Background Script Finished Loading"); 