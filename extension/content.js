// This script is injected into the page to extract the main article content.
// It uses the Readability library (expected to be loaded via manifest.json)

// --- Add at top of file: inject Tildra CSS styles ---
(function injectTildraStyles() {
  const style = document.createElement('style');
  style.id = 'tildra-overlay-styles';
  style.textContent = `
    .tildra-overlay { position: fixed !important; top: 20% !important; left: 50% !important; transform: translateX(-50%) scale(0.9); background: var(--overlay-bg, rgba(20,20,30,0.9)) !important; color: var(--overlay-text, #fff) !important; padding: 1.5rem !important; border-radius: 12px !important; max-width: 450px !important; width: 90% !important; box-shadow: 0 8px 25px rgba(0,0,0,0.6) !important; opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; z-index: 2147483647 !important; font-family: 'Inter', sans-serif !important; }
    .tildra-overlay.show { opacity: 1 !important; transform: translateX(-50%) scale(1) !important; }
    .tildra-close-btn { position: absolute !important; top: 10px !important; right: 10px !important; background: none !important; border: none !important; color: var(--overlay-text, #fff) !important; font-size: 1.5rem !important; cursor: pointer !important; line-height: 1 !important; padding: 5px !important; opacity: 0.7; transition: opacity 0.2s; }
    .tildra-close-btn:hover { opacity: 1; }
    .tildra-content { margin-top: 1.5rem !important; font-size: 14px !important; line-height: 1.6 !important; }
    .tildra-content strong { font-weight: 600 !important; color: var(--overlay-text, #fff) !important;}
    .tildra-content ul { list-style-position: outside !important; padding-left: 20px !important; margin-top: 10px !important; }
    .tildra-content li { margin-bottom: 8px !important; }
  `;
  document.head.appendChild(style);
})();

// Function to remove overlay elements
function removeTildraElements() {
  const overlay = document.getElementById('tildra-summary-overlay');
  if (overlay) {
    overlay.remove();
    console.log('[Tildra Content] Summary overlay removed.');
  }
  const button = document.getElementById('tildra-inline-btn');
  if (button) {
    button.remove();
    console.log('[Tildra Content] Inline button removed.');
  }
}

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
// This top-level call to extractContent() seems out of place for a content script
// that primarily reacts to messages or injects UI. It should typically be called
// only when needed, e.g., when the summarize button is clicked.
// Removing this immediate call:
// extractContent(); 
// --- End Edit --- 

// Message listener for context menu summarization
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'summarizeContext') return true; 
  
  chrome.storage.local.get(['tildraSettings'], (result) => {
    const settings = result.tildraSettings || {};
    console.log('[Tildra Content - summarizeContext] Loaded settings:', settings);
    if (settings.disableOverlay) {
      console.log('[Tildra Content - summarizeContext] Overlay disabled by user setting.');
      removeTildraElements(); 
      sendResponse({ success: false, error: 'Overlay is disabled by user setting.' });
      return;
    }
    
    const input = msg.content || '';
    const overlayBg = settings.overlayBg || 'rgba(20,20,30,0.9)'; 
    const overlayText = settings.overlayText || '#fff';
    
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
        if (!textContent) throw new Error('No content extracted for summarizeContext');
        return getClerkSessionToken().then(token => ({ textContent, token }));
      })
      .then(({ textContent, token }) => {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { action: 'summarizeAPI', textContent, token, url: msg.url || window.location.href, title: msg.title || document.title },
            (resp) => {
              if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
              }
              if (resp && resp.success && resp.summaryData) {
                resolve(resp.summaryData);
              } else {
                reject(new Error(resp.error || 'Summarization failed via context menu'));
              }
            }
          );
        });
      })
      .then(summaryData => {
        removeTildraElements(); // Remove any existing overlay first
        const overlay = document.createElement('div');
        overlay.id = 'tildra-summary-overlay';
        overlay.className = 'tildra-overlay';
        overlay.style.setProperty('background', overlayBg, 'important');
        overlay.style.setProperty('color', overlayText, 'important');
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tildra-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => overlay.remove();
        closeBtn.style.setProperty('color', overlayText, 'important');
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
        console.error('Tildra (content - summarizeContext): summarization error', err);
        // Don't use alert here as it can be disruptive if context menu is used often.
        // Error is logged, and sendResponse indicates failure.
        sendResponse({ success: false, error: err.message });
      });
  });
  return true; 
});

// --- Floating TL;DR Button Logic ---
function ensureFloatingButtonExists(currentSettings) {
    console.log('[Tildra Content] ensureFloatingButtonExists called. Current disableOverlay state:', currentSettings.disableOverlay);

    if (currentSettings.disableOverlay) {
        console.log('[Tildra Content] ensureFloatingButtonExists: Overlay is disabled by settings. Aborting button creation and ensuring removal.');
        removeTildraElements();
        return;
    }

    // Avoid duplicate button
    if (document.getElementById('tildra-inline-btn')) {
        console.log('[Tildra Content] Floating button already exists.');
        return;
    }

    // Only inject on pages with sufficient text content
    const textLength = document.body.innerText.trim().length;
    if (textLength < 200) {
      console.log('[Tildra Content] Content too short, skipping TLDR button injection.');
      return;
    }

    console.log('[Tildra Content] Creating floating button.');
    const btn = document.createElement('button');
    btn.id = 'tildra-inline-btn';
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5h14l-7 14-7-14z" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M17 4.5h4l-7 14-2-4" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
    `;
    btn.title = "Get Summary with Tildra";
    
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '25px',
      right: '25px',
      zIndex: '2147483646', 
      background: 'var(--accent-solid, #7c3aed)', 
      color: '#fff',
      border: 'none',
      borderRadius: '50%',
      width: '52px', 
      height: '52px',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(0,0,0,0.3)', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s, background-color 0.2s',
    });
    document.body.appendChild(btn);
    
    btn.addEventListener('mouseover', () => {
      btn.style.background = 'var(--accent-gradient-hover, #8345f5)'; 
      btn.style.transform = 'scale(1.05)';
    });
    
    btn.addEventListener('mouseout', () => {
      btn.style.background = 'var(--accent-solid, #7c3aed)'; 
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', () => {
      // Re-check settings on click, as they might have changed
      chrome.storage.local.get(['tildraSettings'], (resClick) => {
        const clickSettings = resClick.tildraSettings || {};
        if (clickSettings.disableOverlay) {
          console.log('[Tildra Content - Button Click] Overlay has been disabled. Removing elements.');
          removeTildraElements();
          return;
        }
        
        console.log('[Tildra Content] Inline button clicked, extracting content.');
        const { error, content: articleText } = extractContent();
        if (error || !articleText) {
          console.error('[Tildra Content] extractContent error for button click:', error);
          alert('Tildra Error: ' + (error || 'No content to summarize'));
          return;
        }

        const originalIconHTML = btn.innerHTML;
        btn.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
            <style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_zKoa{animation-delay:-.1s}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}</style>
            <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
            <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75A11,11,0,0,0,12,1Z" class="spinner_V8m1"/>
          </svg>
        `;
        btn.disabled = true;

        getClerkSessionToken()
          .then(token => {
            console.log('[Tildra Content] Sending summarizeAPI message from button click.');
            chrome.runtime.sendMessage(
              { action: 'summarizeAPI', textContent: articleText, token, url: window.location.href, title: document.title },
              (resp) => {
                btn.innerHTML = originalIconHTML;
                btn.disabled = false;

                if (chrome.runtime.lastError) {
                  console.error('[Tildra Content] summarizeAPI error (button click):', chrome.runtime.lastError);
                  alert('Summarization API error: ' + chrome.runtime.lastError.message);
                  return;
                }
                if (!resp || !resp.success) {
                  console.error('[Tildra Content] summarizeAPI response error (button click):', resp);
                  if (resp && resp.expired) {
                    alert('User session expired, please log back in to tildra.xyz and try again.');
                  } else {
                    alert('Summarization API error: ' + (resp?.error || 'Unknown error'));
                  }
                  return;
                }

                const { tldr, key_points } = resp.summaryData;
                removeTildraElements(); // Clear any old overlay before showing new one

                const overlay = document.createElement('div');
                overlay.id = 'tildra-summary-overlay';
                overlay.className = 'tildra-overlay';
                
                overlay.style.setProperty('background', clickSettings.overlayBg || 'rgba(20,20,30,0.9)', 'important');
                overlay.style.setProperty('color', clickSettings.overlayText || '#fff', 'important');

                const closeBtn = document.createElement('button');
                closeBtn.className = 'tildra-close-btn';
                closeBtn.innerHTML = '&times;';
                closeBtn.onclick = () => overlay.remove();
                closeBtn.style.setProperty('color', clickSettings.overlayText || '#fff', 'important');
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
            btn.innerHTML = originalIconHTML;
            btn.disabled = false;
            console.error('[Tildra Content] Auth token error or other pre-API call error (button click):', err);
            if (err.message === 'Authentication token was not retrieved.') {
                 alert('Could not get authentication token. Please ensure you are logged in to tildra.xyz.');
            } else {
                alert('Auth or setup error: ' + err.message);
            }
          });
      }); 
    });
}

// Main logic to control visibility based on settings
function manageTildraVisibility(settings) {
  console.log('[Tildra Content] manageTildraVisibility called. Current disableOverlay state:', settings.disableOverlay);
  if (settings.disableOverlay) {
    removeTildraElements();
  } else {
    // If overlay is not disabled, ensure the button is there (if applicable for the page)
    ensureFloatingButtonExists(settings);
  }
}

// Initialization for the content script
(function initializeTildraContentScript() {
  console.log("[Tildra Content] Initializing Tildra content script...");
  chrome.storage.local.get(['tildraSettings'], (result) => {
    const initialSettings = result.tildraSettings || { disableOverlay: false }; // Sensible default
    console.log('[Tildra Content] Initial settings loaded on script start:', initialSettings);
    manageTildraVisibility(initialSettings);
  });

  // Listen for storage changes to dynamically show/hide elements
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.tildraSettings) {
      const newSettings = changes.tildraSettings.newValue || { disableOverlay: false };
      console.log('[Tildra Content] Settings changed. New settings:', newSettings);
      manageTildraVisibility(newSettings);

      // Update existing overlay styles if it's visible and colors change
      // This part is tricky if manageTildraVisibility removes the overlay due to disableOverlay:true
      // So, only try to update styles if overlay is NOT being disabled.
      if (!newSettings.disableOverlay) {
        const summaryOverlay = document.getElementById('tildra-summary-overlay');
        if (summaryOverlay) {
            if (newSettings.overlayBg) summaryOverlay.style.setProperty('background', newSettings.overlayBg, 'important');
            if (newSettings.overlayText) summaryOverlay.style.setProperty('color', newSettings.overlayText, 'important');
            const closeBtn = summaryOverlay.querySelector('.tildra-close-btn');
            if (closeBtn && newSettings.overlayText) closeBtn.style.setProperty('color', newSettings.overlayText, 'important');
        }
      }
    }
  });
})();

console.log("Tildra Content Script Finished Execution (bottom of script)");
