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
    chrome.cookies.get({ url: COOKIE_DOMAIN_URL, name: COOKIE_NAME }, (cookie) => {
      if (chrome.runtime.lastError || !cookie) {
        console.warn('Tildra (background): cookie.get error', chrome.runtime.lastError?.message);
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Cookie not found' });
      } else {
        sendResponse({ success: true, token: cookie.value });
      }
    });
    return true;
  }

  // Backend summarization request
  if (msg.action === 'summarizeAPI') {
    const textContent = msg.textContent;
    // Get session token and perform API call
    chrome.cookies.get({ url: COOKIE_DOMAIN_URL, name: COOKIE_NAME }, (cookie) => {
      const token = cookie?.value || '';
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
        .then(data => sendResponse({ success: true, summaryData: data }))
        .catch(err => {
          console.error('Tildra (background): summarization API error', err);
          sendResponse({ success: false, error: err.message });
        });
    });
    return true;
  }

  return false; // unknown message
}); 