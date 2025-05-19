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
const API_URL = 'https://tildra.fly.dev/summarize';
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
        console.error("Tildra (content script): Readability library not loaded.");
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
            console.warn("Tildra (content script): Readability could not parse article content.");
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
        console.error("Tildra (content script): Error during Readability parsing:", e);
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
  chrome.storage.local.get(['tildraSettings'], (result) => {
    if (result.tildraSettings && result.tildraSettings.disableOverlay) {
      sendResponse({ success: false, error: 'Overlay is disabled by user setting.' });
      return;
    }
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
  });
  return true; // Keep port open for async
});

// --- Floating TL;DR Button Injection ---
(function injectInlineTLDR() {
  chrome.storage.local.get(['tildraSettings'], (result) => {
    if (result.tildraSettings && result.tildraSettings.disableOverlay) {
      console.log('[Tildra] Overlay is disabled by user setting.');
      return;
    }
    console.log('[Tildra] injectInlineTLDR invoked');
    // Avoid duplicate button
    if (document.getElementById('tildra-inline-btn')) return;

    // Only inject on pages with sufficient text content
    const textLength = document.body.innerText.trim().length;
    if (textLength < 200) {
      console.log('[Tildra] Content too short, skipping TLDR injection');
      return;
    }

    // Create floating button with logo
    const btn = document.createElement('button');
    btn.id = 'tildra-inline-btn';
    // Use SVG for the logo instead of text
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5h14l-7 14-7-14z" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M17 4.5h4l-7 14-2-4" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
    `;
    btn.title = "Get Summary with Tildra";
    
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '99999',
      background: 'rgba(0, 0, 0, 0.75)',
      color: '#fff',
      border: 'none',
      borderRadius: '50%',
      width: '56px',
      height: '56px',
      cursor: 'pointer',
      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s, background-color 0.2s',
    });
    document.body.appendChild(btn);
    
    // Add hover effect
    btn.addEventListener('mouseover', () => {
      btn.style.background = 'rgba(40, 40, 40, 0.9)';
      btn.style.transform = 'scale(1.05)';
    });
    
    btn.addEventListener('mouseout', () => {
      btn.style.background = 'rgba(0, 0, 0, 0.75)';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', () => {
      console.log('[Tildra] Inline button clicked, extracting content');
      const { error, content: articleText } = extractContent();
      if (error || !articleText) {
        console.error('[Tildra] extractContent error', error);
        alert('Tildra Error: ' + (error || 'No content to summarize'));
        return;
      }

      // --- Start Loading Indicator ---
      const originalIconHTML = btn.innerHTML;
      btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
          <style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_zKoa{animation-delay:-.1s}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}</style>
          <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
          <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75A11,11,0,0,0,12,1Z" class="spinner_V8m1"/>
        </svg>
      `;
      btn.disabled = true;
      // --- End Loading Indicator ---

      getClerkSessionToken()
        .then(token => {
          console.log('[Tildra] Sending summarizeAPI message');
          // --- Log the received token before sending ---
          if (token) {
            console.log('[Tildra Content] Received token starting with:', token.substring(0, 10) + '...');
          } else {
            console.warn('[Tildra Content] Received null/empty token from background.');
            // Handle the case where token is missing before sending API message
            throw new Error('Authentication token was not retrieved.'); // Stop before sending summarizeAPI
          }
          // --- End logging ---
          chrome.runtime.sendMessage(
            { action: 'summarizeAPI', textContent: articleText, token },
            (resp) => {
              // --- Restore Button State ---
              btn.innerHTML = originalIconHTML;
              btn.disabled = false;
              // --- End Restore Button State ---

              if (chrome.runtime.lastError) {
                console.error('[Tildra] summarizeAPI error', chrome.runtime.lastError);
                alert('Summarization API error: ' + chrome.runtime.lastError.message);
                return;
              }
              if (!resp || !resp.success) {
                console.error('[Tildra] summarizeAPI response error', resp);
                // --- Check for expired token flag ---
                if (resp && resp.expired) {
                  alert('User session expired, please log back in to tildra.xyz and try again.');
                } else {
                  // Use the error message from the background script
                  alert('Summarization API error: ' + (resp?.error || 'Unknown error'));
                }
                // --- End check ---
                return;
              }

              const { tldr, key_points } = resp.summaryData;
              // Display overlay
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
              tldrDiv.innerHTML = `<strong>Summary:</strong> ${tldr}`;
              overlay.appendChild(tldrDiv);
              const ul = document.createElement('ul');
              ul.className = 'tildra-content';
              key_points.forEach(pt => {
                const li = document.createElement('li');
                li.textContent = pt;
                ul.appendChild(li);
              });
              overlay.appendChild(ul);
              document.body.appendChild(overlay);
              requestAnimationFrame(() => overlay.classList.add('show'));
            }
          );
        })
        .catch(err => {
          // --- Restore Button State on Error ---
          btn.innerHTML = originalIconHTML;
          btn.disabled = false;
          // --- End Restore Button State on Error ---
          console.error('[Tildra] auth token error', err);
          // Display specific message if auth token retrieval failed
          if (err.message === 'Authentication token was not retrieved.') {
               alert('Could not get authentication token. Please ensure you are logged in to tildra.xyz.');
          } else {
              // Generic error for other issues in the promise chain before API call
              alert('Auth or setup error: ' + err.message);
          }
        });
    });
  });
})();

console.log("Tildra Content Script Finished Execution");
