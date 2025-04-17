// This script is injected into the page to extract the main article content.
// It uses the Readability library (expected to be loaded via manifest.json)

// --- Add at top of file: inject Tildra CSS styles ---
(function injectTildraStyles() {
  const style = document.createElement('style');
  style.id = 'tildra-overlay-styles';
  style.textContent = `
    .tildra-overlay { position: fixed; top: 20%; left: 50%; transform: translateX(-50%) scale(0.9); background: rgba(0,0,0,0.8); color: #fff; padding: 1rem; border-radius: 8px; max-width: 400px; width: 90%; box-shadow: 0 4px 12px rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; z-index: 99999; }
    .tildra-overlay.show { opacity: 1; transform: translateX(-50%) scale(1); }
    .tildra-close-btn { position: absolute; top: 8px; right: 8px; background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; }
    .tildra-content { margin-top: 1.5rem; font-size: 0.9rem; line-height: 1.4; }
  `;
  document.head.appendChild(style);
})();

// --- Add after style injection and before extractContent ---
const API_URL = 'https://snipsummary.fly.dev/summarize';
const COOKIE_DOMAIN_URL = 'https://www.tildra.xyz';
const COOKIE_NAME = '__session';

// Get Clerk session token from background via messaging
function getClerkSessionToken() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getSessionToken' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Tildra (content): sendMessage error getting token', chrome.runtime.lastError.message);
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (response && response.success && response.token) {
        resolve(response.token);
      } else {
        const err = response?.error || 'Failed to retrieve session token';
        console.error('Tildra (content): getSessionToken response error', err);
        reject(new Error(err));
      }
    });
  });
}

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

// Remove old onMessage listener and replace with API call
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'summarizeContext') return;
  const input = msg.content || '';

  // Extract full content: either fetch URL or use selected text
  const extractFullText = input.startsWith('http')
    ? fetch(input)
        .then(res => res.text())
        .then(html => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const article = new Readability(doc).parse();
          return article?.textContent || '';
        })
        .catch(() => '')
    : Promise.resolve(input);

  extractFullText
    .then(textContent => {
      if (!textContent) throw new Error('No content extracted');
      return getClerkSessionToken().then(token => ({ textContent, token }));
    })
    .then(({ textContent, token }) => {
      // Delegate summarization to background to bypass CORS
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'summarizeAPI', textContent, token },
          (resp) => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            if (resp && resp.success && resp.summaryData) {
              resolve(resp.summaryData);
            } else {
              reject(new Error(resp.error || 'Summarization failed'));
            }
          }
        );
      });
    })
    .then(summaryData => {
      // summaryData has { tldr, key_points }, display overlay
      const existing = document.getElementById('tildra-summary-overlay');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = 'tildra-summary-overlay';
      overlay.className = 'tildra-overlay';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'tildra-close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = () => overlay.remove();
      overlay.appendChild(closeBtn);
      const tldrDiv = document.createElement('div');
      tldrDiv.className = 'tildra-content';
      tldrDiv.innerHTML = `<strong>Summary:</strong> ${summaryData.tldr}`;
      overlay.appendChild(tldrDiv);
      const ul = document.createElement('ul');
      ul.className = 'tildra-content';
      summaryData.key_points.forEach(pt => {
        const li = document.createElement('li');
        li.textContent = pt;
        ul.appendChild(li);
      });
      overlay.appendChild(ul);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      sendResponse({ success: true });
    })
    .catch(err => {
      console.error('Tildra (content): summarization error', err);
      alert('Tildra Summary Error: ' + err.message);
      sendResponse({ success: false });
    });
  return true; // Keep port open for async
});