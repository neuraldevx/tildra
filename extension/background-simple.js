console.log("Tildra Background Script (Simple) Loaded");

// In-memory store for job details detected on tabs
let activeJobDetailsByTabId = {};

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[Tildra Background] Received message:', msg.action || msg.type);
    
    // Handle job detection messages from content script
    if (msg.type === "JOB_PAGE_DETECTED") {
        const tabId = sender.tab?.id;
        if (tabId) {
            activeJobDetailsByTabId[tabId] = msg.data;
            console.log(`[Tildra Background] Job details stored for tab ${tabId}:`, msg.data);
            
            // Update browser action badge
            chrome.action.setBadgeText({
                tabId: tabId,
                text: "JOB"
            });
            chrome.action.setBadgeBackgroundColor({
                tabId: tabId,
                color: "#00A36C"
            });
        }
        sendResponse({ success: true });
        return true;
    }
    
    // Handle enhanced job details
    if (msg.type === "ENHANCE_JOB_DETAILS") {
        console.log('[Tildra Background] Job details enhancement requested:', msg.data);
        // For now, just acknowledge - enhancement can be added later if needed
        sendResponse({ success: true });
        return true;
    }
    
    // Handle job detection failures
    if (msg.type === "JOB_PAGE_SCRAPE_FAILED") {
        const tabId = sender.tab?.id;
        if (tabId) {
            chrome.action.setBadgeText({
                tabId: tabId,
                text: ""
            });
        }
        sendResponse({ success: true });
        return true;
    }
    
    // Handle manual job detection trigger from popup
    if (msg.action === 'triggerJobDetection') {
        const tabId = msg.tabId;
        if (tabId) {
            // Send message to content script to trigger job detection
            chrome.tabs.sendMessage(tabId, { action: 'triggerJobDetection' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[Tildra Background] Error triggering job detection:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    sendResponse({ success: response?.success || false });
                }
            });
        } else {
            sendResponse({ success: false, error: 'No tab ID provided' });
        }
        return true; // Keep message channel open
    }
    
    // Handle requests for job details from popup
    if (msg.action === 'getJobDetails') {
        const tabId = msg.tabId;
        const jobDetails = activeJobDetailsByTabId[tabId] || null;
        console.log(`[Tildra Background] Popup requested job details for tab ${tabId}:`, jobDetails);
        sendResponse({ 
            success: !!jobDetails, 
            jobDetails: jobDetails 
        });
        return true;
    }
    
    // Handle session token requests (placeholder for now)
    if (msg.action === 'getSessionToken') {
        // For now, just return null - authentication can be added later if needed
        sendResponse({ token: null });
        return true;
    }
});

// Clean up job details when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (activeJobDetailsByTabId[tabId]) {
        delete activeJobDetailsByTabId[tabId];
        console.log(`[Tildra Background] Cleaned up job details for closed tab ${tabId}`);
    }
});

// Clear badge when navigating to new pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        // Clear badge and job details when navigating to a new page
        chrome.action.setBadgeText({
            tabId: tabId,
            text: ""
        });
        if (activeJobDetailsByTabId[tabId]) {
            delete activeJobDetailsByTabId[tabId];
        }
    }
});

console.log("[Tildra Background] Simple background script initialized successfully"); 