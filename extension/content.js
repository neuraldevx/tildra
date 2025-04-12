// This script is injected into the page to extract the main article content.
// It uses the Readability library (expected to be loaded via manifest.json)

// --- Start Edit: Return structured object { error: ..., content: ... } --- 
function extractContent() {
    // Check if Readability is available
    if (typeof Readability === 'undefined') {
        console.error("SnipSummary (content script): Readability library not loaded.");
        return { error: "Readability library not loaded on the page.", content: null };
    }

    try {
        // Clone the document to avoid modifying the original page
        const documentClone = document.cloneNode(true);
        const reader = new Readability(documentClone, {
             // Optional: Disable debug logging if desired
             // debug: true 
        });
        const article = reader.parse();

        if (article && article.textContent) {
            // Return success object
            return { error: null, content: article.textContent };
        } else {
            console.warn("SnipSummary (content script): Readability could not parse article content.");
            // Fallback: attempt to get text from the main element or body
            let fallbackContent = document.body ? document.body.innerText : '';
            const mainElement = document.querySelector('main');
            if (mainElement && mainElement.innerText) {
                 fallbackContent = mainElement.innerText;
            }
             // Return error object but include fallback content if found
            return { error: "Readability could not parse effectively.", content: fallbackContent }; 
        }
    } catch (e) {
        console.error("SnipSummary (content script): Error during Readability parsing:", e);
        // Fallback in case of error
         let fallbackContent = document.body ? document.body.innerText : '';
         const mainElement = document.querySelector('main');
         if (mainElement && mainElement.innerText) {
             fallbackContent = mainElement.innerText;
         }
        // Return error object but include fallback content if found
        return { error: `Readability parsing failed: ${e.message}`, content: fallbackContent }; 
    }
}

// Execute the function and implicitly return its result to the caller (popup.js)
extractContent();
// --- End Edit --- 