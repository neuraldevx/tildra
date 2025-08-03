/**
 * Tildra.xyz Authentication Content Script
 *
 * This script runs ONLY on tildra.xyz pages. Its sole responsibility
 * is to get the Clerk JWT from the page and save it for the extension.
 * It injects `injector.js` to securely access localStorage.
 */
console.log("[Tildra Auth] Content script initialized. Setting up injector and listener.");

// 1. Listen for the token from the injected script
window.addEventListener("message", (event) => {
    // We only accept messages from ourselves
    if (event.source !== window || !event.data || event.data.type !== "TILDRA_AUTH_TOKEN") {
        return;
    }

    if (event.data.token) {
        console.log("[Tildra Auth] Received token from injected script.");
        chrome.storage.local.set({ 'authToken': event.data.token }, () => {
            if (chrome.runtime.lastError) {
                console.error("[Tildra Auth] Error saving token:", chrome.runtime.lastError.message);
            } else {
                console.log("[Tildra Auth] Token successfully stored.");
            }
        });
    }
}, false);

// 2. Listen for messages from popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'refreshToken') {
        console.log("[Tildra Auth] Received refreshToken request from popup");
        injectScript(); // Force a fresh token capture
        sendResponse({ success: true });
        return true;
    }
});

// 3. Inject the script that will fetch the token
function injectScript() {
    try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injector.js');
        script.onload = function() {
            // The injector script removes itself after loading
            console.log("[Tildra Auth] Injector script executed for token refresh");
        };
        (document.head || document.documentElement).appendChild(script);
    } catch (e) {
        console.error('[Tildra Auth] Failed to inject auth script:', e);
    }
}

// 4. Run the injector periodically to ensure we always have the latest token
// This ensures that if the user logs in or the token is refreshed, we capture it.
setInterval(injectScript, 2000); // Check every 2 seconds
