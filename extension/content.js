// This script is injected into the page to extract the main article content.
// It uses the Readability library (expected to be loaded via manifest.json)

(function() {
    // Check if Readability is available
    if (typeof Readability === 'undefined') {
        console.error("SnipSummary: Readability library not loaded.");
        return ""; // Return empty string to indicate failure
    }

    try {
        // Clone the document to avoid modifying the original page
        const documentClone = document.cloneNode(true);
        const reader = new Readability(documentClone);
        const article = reader.parse();

        if (article && article.textContent) {
            // Return the extracted text content
            // We'll send this back to the popup script
            return article.textContent;
        } else {
            console.warn("SnipSummary: Readability could not parse article content.");
            // Fallback: attempt to get text from the main element or body
            const mainElement = document.querySelector('main');
            if (mainElement) return mainElement.innerText;
            return document.body.innerText; // Less accurate fallback
        }
    } catch (e) {
        console.error("SnipSummary: Error during Readability parsing:", e);
        // Fallback in case of error
        const mainElement = document.querySelector('main');
        if (mainElement) return mainElement.innerText;
        return document.body.innerText; 
    }
})(); // Immediately invoke the function 