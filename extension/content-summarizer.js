/**
 * Tildra Content Summarizer Script
 *
 * This script runs on all pages EXCEPT tildra.xyz.
 * It is responsible for extracting page content using the Readability.js
 * library and sending it to the popup for summarization.
 */

// This listener waits for a request from the popup script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if the request is to get page content
    if (request.action === "getPageContent") {
        try {
            // Use the Readability library, which is loaded via manifest.json
            const documentClone = document.cloneNode(true);
            const article = new Readability(documentClone).parse();

            if (article && article.textContent) {
                console.log("[Tildra Summarizer] Successfully extracted article content.");
                sendResponse({
                    success: true,
                    title: article.title,
                    content: article.textContent
                });
            } else {
                console.error("[Tildra Summarizer] Readability could not extract content.");
                sendResponse({ success: false, error: "Could not extract article content." });
            }
        } catch (e) {
            console.error("[Tildra Summarizer] Error during content extraction:", e);
            sendResponse({ success: false, error: e.toString() });
        }
        // Return true to indicate that the response will be sent asynchronously
        return true; 
    }
});

console.log("[Tildra Summarizer] Content script for summarization loaded."); 