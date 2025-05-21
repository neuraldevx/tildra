// This script is injected into the page to extract the main article content.
// It uses the Readability library (expected to be loaded via manifest.json)

let tildraSidebar = null;
let tildraSidebarContent = null;
let tildraFloatingButton = null;

// --- Add at top of file: inject Tildra CSS styles ---
(function injectTildraStyles() {
  const style = document.createElement('style');
  style.id = 'tildra-styles'; // Renamed from tildra-overlay-styles
  style.textContent = `
    /* Styles for the new Sidebar */
    #tildra-sidebar {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: 320px !important; /* Initial width */
      height: 100% !important;
      background: var(--overlay-bg, #1f2937) !important; /* Default dark theme */
      color: var(--overlay-text, #f3f4f6) !important;
      box-shadow: -5px 0 15px rgba(0,0,0,0.2) !important;
      z-index: 2147483646 !important; /* Just below max z-index */
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 0 !important; /* Remove padding from sidebar itself, apply to header/content */
    }
    #tildra-sidebar.visible {
      transform: translateX(0);
    }
    #tildra-sidebar-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 12px 16px !important;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    #tildra-sidebar-title {
      font-size: 16px !important;
      font-weight: 600 !important;
    }
    #tildra-sidebar-close-btn {
      background: none !important;
      border: none !important;
      color: var(--overlay-text, #f3f4f6) !important;
      font-size: 24px !important;
      cursor: pointer !important;
      opacity: 0.7;
      transition: opacity 0.2s;
      padding: 5px !important;
    }
    #tildra-sidebar-close-btn:hover { opacity: 1; }
    #tildra-sidebar-content {
      padding: 16px !important;
      overflow-y: auto !important;
      flex-grow: 1 !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
      position: relative; /* For scroll indicator track positioning */
    }
    #tildra-sidebar-content h4 {
        font-size: 13px; 
        font-weight: 600; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
        margin: 16px 0 8px 0;
        color: var(--accent-primary, #7c3aed);
    }
    #tildra-sidebar-content p, #tildra-sidebar-content ul {
        margin-bottom: 12px;
    }
    #tildra-sidebar-content ul { list-style-position: outside; padding-left: 20px; }
    #tildra-sidebar-content li { margin-bottom: 6px; }
    #tildra-sidebar-status {
        padding: 10px 16px;
        text-align: center;
        font-style: italic;
        color: var(--text-muted-dark, #8e8ea0);
    }

    /* Scroll Indicator Styles */
    #tildra-scroll-indicator-track {
      position: absolute !important;
      right: 2px !important; /* Position to the very right of the content area */
      top: 0 !important;
      bottom: 0 !important;
      width: 4px !important;
      background-color: rgba(255, 255, 255, 0.1) !important;
      border-radius: 2px !important;
    }
    #tildra-scroll-indicator-thumb {
      position: absolute !important;
      left: 0 !important;
      width: 100% !important;
      height: 30px !important; /* Height of the thumb */
      background-color: var(--accent-primary, #7c3aed) !important;
      border-radius: 2px !important;
      opacity: 0.7 !important;
      transition: opacity 0.2s ease;
    }
    #tildra-scroll-indicator-thumb:hover {
        opacity: 1 !important;
    }
    .summary-sentence-highlighted {
        background-color: rgba(124, 58, 237, 0.2); /* Use accent color with low opacity */
        border-radius: 3px;
        padding: 0 2px;
        margin: 0 -2px;
    }

    /* Styles for the old modal overlay (will be phased out or repurposed) */
    .tildra-modal-overlay { position: fixed !important; top: 20% !important; left: 50% !important; transform: translateX(-50%) scale(0.9); background: var(--overlay-bg, rgba(20,20,30,0.9)) !important; color: var(--overlay-text, #fff) !important; padding: 1.5rem !important; border-radius: 12px !important; max-width: 450px !important; width: 90% !important; box-shadow: 0 8px 25px rgba(0,0,0,0.6) !important; opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; z-index: 2147483647 !important; font-family: 'Inter', sans-serif !important; }
    .tildra-modal-overlay.show { opacity: 1 !important; transform: translateX(-50%) scale(1) !important; }
    .tildra-modal-close-btn { position: absolute !important; top: 10px !important; right: 10px !important; background: none !important; border: none !important; color: var(--overlay-text, #fff) !important; font-size: 1.5rem !important; cursor: pointer !important; line-height: 1 !important; padding: 5px !important; opacity: 0.7; transition: opacity 0.2s; }
    .tildra-modal-close-btn:hover { opacity: 1; }
    .tildra-modal-content { margin-top: 1.5rem !important; font-size: 14px !important; line-height: 1.6 !important; }
    .tildra-modal-content strong { font-weight: 600 !important; color: var(--overlay-text, #fff) !important;}
    .tildra-modal-content ul { list-style-position: outside !important; padding-left: 20px !important; margin-top: 10px !important; }
    .tildra-modal-content li { margin-bottom: 8px !important; }

    /* Floating Action Button (FAB) */
    #tildra-inline-btn {
        /* Styles defined in ensureFloatingButtonExists if created */
    }
  `;
  document.head.appendChild(style);
})();

// Function to create the sidebar if it doesn't exist
function ensureSidebarExists() {
    if (document.getElementById('tildra-sidebar')) return;

    tildraSidebar = document.createElement('div');
    tildraSidebar.id = 'tildra-sidebar';
    
    // Sidebar Header
    const sidebarHeader = document.createElement('div');
    sidebarHeader.id = 'tildra-sidebar-header';
    const title = document.createElement('span');
    title.id = 'tildra-sidebar-title';
    title.textContent = 'Tildra Summary';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'tildra-sidebar-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => toggleSidebar(false);
    sidebarHeader.appendChild(title);
    sidebarHeader.appendChild(closeBtn);
    tildraSidebar.appendChild(sidebarHeader);

    // Sidebar Content Area
    tildraSidebarContent = document.createElement('div');
    tildraSidebarContent.id = 'tildra-sidebar-content';
    tildraSidebarContent.innerHTML = '<div id="tildra-sidebar-status">Summarize any page...</div>'; // Initial status
    
    // Scroll Indicator Track & Thumb
    const scrollTrack = document.createElement('div');
    scrollTrack.id = 'tildra-scroll-indicator-track';
    const scrollThumb = document.createElement('div');
    scrollThumb.id = 'tildra-scroll-indicator-thumb';
    scrollTrack.appendChild(scrollThumb);
    // Append track to content area so it scrolls with it, but positioned absolutely relative to it
    tildraSidebarContent.appendChild(scrollTrack);

    tildraSidebar.appendChild(tildraSidebarContent);
    
    document.body.appendChild(tildraSidebar);
    console.log('[Tildra Content] Sidebar created.');
}

function toggleSidebar(forceShow) {
    if (!tildraSidebar) ensureSidebarExists(); // Create if doesn't exist
    if (tildraSidebar) {
        const show = typeof forceShow === 'boolean' ? forceShow : !tildraSidebar.classList.contains('visible');
        tildraSidebar.classList.toggle('visible', show);
        console.log(`[Tildra Content] Sidebar visibility toggled to: ${show}`);
    }
}

// Function to display summary data in the sidebar
function displaySummaryInSidebar(summaryData, settings) {
    if (!tildraSidebar || !tildraSidebarContent) {
        ensureSidebarExists();
    }
    if (!tildraSidebarContent) {
        console.error('[Tildra Content] Sidebar content area not found, cannot display summary.');
        return;
    }

    tildraSidebarContent.innerHTML = ''; 
    summarySentences = []; // Reset for new summary

    const scrollTrackNew = document.createElement('div');
    scrollTrackNew.id = 'tildra-scroll-indicator-track';
    const scrollThumbNew = document.createElement('div');
    scrollThumbNew.id = 'tildra-scroll-indicator-thumb';
    scrollTrackNew.appendChild(scrollThumbNew);
    tildraSidebarContent.appendChild(scrollTrackNew);

    const tldrHeader = document.createElement('h4');
    tldrHeader.textContent = 'TL;DR';
    tildraSidebarContent.appendChild(tldrHeader);
    const tldrP = document.createElement('p');
    // Split TLDR into sentences and wrap each in a span
    const tldrSentences = summaryData.tldr.match(/[^.!?]+[.!?]+/g) || [summaryData.tldr];
    tldrSentences.forEach((sentence, index) => {
        const span = document.createElement('span');
        span.textContent = sentence + ' '; // Add space for readability
        span.dataset.summarySentenceIndex = summarySentences.length;
        tldrP.appendChild(span);
        summarySentences.push(span);
    });
    tildraSidebarContent.appendChild(tldrP);

    const keyPointsHeader = document.createElement('h4');
    keyPointsHeader.textContent = 'Key Points';
    tildraSidebarContent.appendChild(keyPointsHeader);
    const keyPointsUl = document.createElement('ul');
    summaryData.key_points.forEach((point, index) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = point;
        span.dataset.summarySentenceIndex = summarySentences.length;
        li.appendChild(span);
        keyPointsUl.appendChild(li);
        summarySentences.push(span);
    });
    tildraSidebarContent.appendChild(keyPointsUl);

    if (settings && tildraSidebar) {
        if (settings.overlayBg) tildraSidebar.style.setProperty('background', settings.overlayBg, 'important');
        if (settings.overlayText) {
             tildraSidebar.style.setProperty('color', settings.overlayText, 'important');
             const closeBtn = tildraSidebar.querySelector('#tildra-sidebar-close-btn');
             if(closeBtn) closeBtn.style.setProperty('color', settings.overlayText, 'important');
        }
    }

    toggleSidebar(true); 
    console.log('[Tildra Content] Summary displayed in sidebar with sentence spans.');
    updateScrollIndicator(); 
}

// Function to remove Tildra UI elements (sidebar and button)
function removeTildraElements() {
  if (tildraSidebar) {
    tildraSidebar.remove();
    tildraSidebar = null; // Nullify to allow recreation
    tildraSidebarContent = null;
    console.log('[Tildra Content] Sidebar removed.');
  }
  if (tildraFloatingButton) {
    tildraFloatingButton.remove();
    tildraFloatingButton = null; // Nullify to allow recreation
    console.log('[Tildra Content] Inline button removed.');
  }
}

const API_URL = 'https://tildra.fly.dev/summarize';
const COOKIE_DOMAIN_URL = 'https://www.tildra.xyz';
const COOKIE_NAME = '__session';

function getClerkSessionToken() {
  return new Promise((resolve, reject) => {
    // Check if chrome.runtime is available, otherwise, we are in a dead context or test environment
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      console.warn('[Tildra Content] chrome.runtime.sendMessage is not available. Context might be invalidated or in test.');
      return reject(new Error('Extension context for chrome.runtime.sendMessage not available.'));
    }

    chrome.runtime.sendMessage({ action: 'getSessionToken' }, (response) => {
      if (chrome.runtime.lastError) {
        // Log the error but don't reject if it's a context invalidated error, as the script might be shutting down.
        console.error('Tildra (content): Error during getSessionToken sendMessage:', chrome.runtime.lastError.message);
        if (chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
          // Context is gone, no point in rejecting or resolving further.
          // The promise will remain pending, which is fine as no one should be waiting indefinitely.
          return;
        }
        return reject(new Error(chrome.runtime.lastError.message));
      }
      
      // Additional check for response, as sendMessage can succeed with no response if context is closing.
      if (typeof response === 'undefined') {
        console.warn('[Tildra Content] getSessionToken received undefined response. Context might be closing.');
        // Similar to context invalidated, avoid rejecting if the context is likely gone.
        return;
      }

      if (response && response.success && response.token) {
        resolve(response.token);
      } else {
        const err = response?.error || 'Failed to retrieve session token (no response.success or no token)';
        console.error('Tildra (content): getSessionToken response error:', err);
        reject(new Error(err));
      }
    });
  });
}

function extractContent() {
    if (typeof Readability === 'undefined') {
        console.error("Tildra (content script): Readability library not loaded.");
        return { error: "Readability library not loaded on the page.", content: null };
    }
    try {
        const documentClone = document.cloneNode(true);
        const reader = new Readability(documentClone);
        const article = reader.parse();
        if (article && article.textContent) {
            return { error: null, content: article.textContent };
        } else {
            console.warn("Tildra (content script): Readability could not parse article content.");
            let fallbackContent = document.body ? document.body.innerText : '';
            const mainElement = document.querySelector('main');
            if (mainElement && mainElement.innerText) fallbackContent = mainElement.innerText;
            return { error: "Readability could not parse effectively.", content: fallbackContent }; 
        }
    } catch (e) {
        console.error("Tildra (content script): Error during Readability parsing:", e);
        let fallbackContent = document.body ? document.body.innerText : '';
        const mainElement = document.querySelector('main');
        if (mainElement && mainElement.innerText) fallbackContent = mainElement.innerText;
        return { error: `Readability parsing failed: ${e.message}`, content: fallbackContent }; 
    }
}

// Message listener for context menu summarization (now displays in sidebar)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'summarizeContext') return true; 
  
  chrome.storage.local.get(['tildraSettings'], (result) => {
    const settings = result.tildraSettings || {};
    console.log('[Tildra Content - summarizeContext] Loaded settings:', settings);
    if (settings.disableOverlay) { 
      console.log('[Tildra Content - summarizeContext] Tildra UI disabled by user setting.');
      removeTildraElements(); 
      sendResponse({ success: false, error: 'Tildra UI is disabled by user setting.' });
      return;
    }
    
    const input = msg.content || '';
    // Note: overlayBg and overlayText from settings will be applied in displaySummaryInSidebar

    const extractFullText = input.startsWith('http')
      ? fetch(input).then(res => res.text()).then(html => new Readability(new DOMParser().parseFromString(html, 'text/html')).parse()?.textContent || '').catch(() => '')
      : Promise.resolve(input);

    if (tildraSidebarContent) tildraSidebarContent.innerHTML = '<div id="tildra-sidebar-status">Summarizing...</div>';
    toggleSidebar(true); 

    extractFullText
      .then(textContent => {
        if (!textContent) throw new Error('No content extracted for summarizeContext');
        return getClerkSessionToken().then(token => ({ textContent, token }));
      })
      .then(({ textContent, token }) => {
        return new Promise((resolveAPI, rejectAPI) => {
          try {
            if (!chrome.runtime || !chrome.runtime.sendMessage) {
              console.warn('[Tildra Content - summarizeContext] Bailing: chrome.runtime.sendMessage is not available.');
              return rejectAPI(new Error('Extension context for chrome.runtime.sendMessage not available.'));
            }
            chrome.runtime.sendMessage(
              { action: 'summarizeAPI', textContent, token, url: msg.url || window.location.href, title: msg.title || document.title },
              (resp) => {
                if (chrome.runtime.lastError) {
                  console.error('[Tildra Content - summarizeContext] sendMessage lastError:', chrome.runtime.lastError.message);
                  // Do not reject if context is invalidated, as the script might be shutting down.
                  if (!chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
                    rejectAPI(new Error(chrome.runtime.lastError.message));
                  }
                  return; // Stop processing if there was an error
                }
                if (typeof resp === 'undefined') {
                  console.warn('[Tildra Content - summarizeContext] sendMessage undefined response. Context might be closing.');
                  return; // Stop processing if response is undefined
                }
                if (resp && resp.success && resp.summaryData) resolveAPI(resp.summaryData);
                else rejectAPI(new Error(resp.error || 'Summarization failed via context menu (API response error)'));
              }
            );
          } catch (e) {
            console.error('[Tildra Content - summarizeContext] Error sending summarizeAPI message:', e);
            rejectAPI(e);
          }
        });
      })
      .then(summaryData => {
        displaySummaryInSidebar(summaryData, settings);
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error('Tildra (content - summarizeContext): summarization error', err);
        if (tildraSidebarContent) tildraSidebarContent.innerHTML = `<div id="tildra-sidebar-status">Error: ${err.message}</div>`;
        sendResponse({ success: false, error: err.message });
      });
  });
  return true; 
});

function ensureFloatingButtonExists(currentSettings) {
    console.log('[Tildra Content] ensureFloatingButtonExists called. Current disableOverlay state:', currentSettings.disableOverlay);

    if (currentSettings.disableOverlay) {
        console.log('[Tildra Content] ensureFloatingButtonExists: Tildra UI (button/sidebar) is disabled. Aborting button creation.');
        // Visibility managed by manageTildraVisibility which calls removeTildraElements
        return;
    }

    if (document.getElementById('tildra-inline-btn')) {
        console.log('[Tildra Content] Floating button already exists.');
        tildraFloatingButton = document.getElementById('tildra-inline-btn'); // Ensure global var is set
        return;
    }

    const textLength = document.body.innerText.trim().length;
    if (textLength < 200) {
      console.log('[Tildra Content] Content too short, skipping TLDR button injection.');
      return;
    }

    console.log('[Tildra Content] Creating floating button.');
    tildraFloatingButton = document.createElement('button');
    tildraFloatingButton.id = 'tildra-inline-btn';
    tildraFloatingButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5h14l-7 14-7-14z" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M17 4.5h4l-7 14-2-4" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
    `;
    tildraFloatingButton.title = "Toggle Tildra Summary Sidebar";
    
    Object.assign(tildraFloatingButton.style, {
      position: 'fixed',
      bottom: '25px',
      right: '25px',
      zIndex: '2147483645', // Below sidebar but above most page content
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
    document.body.appendChild(tildraFloatingButton);
    
    tildraFloatingButton.addEventListener('mouseover', () => { tildraFloatingButton.style.background = 'var(--accent-gradient-hover, #8345f5)'; tildraFloatingButton.style.transform = 'scale(1.05)'; });
    tildraFloatingButton.addEventListener('mouseout', () => { tildraFloatingButton.style.background = 'var(--accent-solid, #7c3aed)'; tildraFloatingButton.style.transform = 'scale(1)'; });

    // CLICKING THE BUTTON NOW TOGGLES THE SIDEBAR AND THEN SUMMARIZES IF SIDEBAR BECOMES VISIBLE
    tildraFloatingButton.addEventListener('click', () => {
      chrome.storage.local.get(['tildraSettings'], (resClick) => {
        const clickSettings = resClick.tildraSettings || {};
        if (clickSettings.disableOverlay) {
          console.log('[Tildra Content - Button Click] Tildra UI has been disabled. Removing elements.');
          removeTildraElements();
          return;
        }
        
        toggleSidebar(); 

        if (tildraSidebar && tildraSidebar.classList.contains('visible')) {
            const statusDiv = tildraSidebarContent.querySelector('#tildra-sidebar-status');
            if (statusDiv && statusDiv.textContent.includes('Summarize any page')) {
                 if (tildraSidebarContent) tildraSidebarContent.innerHTML = '<div id="tildra-sidebar-status">Extracting content...</div>';
                
                console.log('[Tildra Content] Inline button clicked, sidebar opened, extracting content.');
                const { error, content: articleText } = extractContent();
                if (error || !articleText) {
                  console.error('[Tildra Content] extractContent error for button click:', error);
                  if(tildraSidebarContent) tildraSidebarContent.innerHTML = `<div id="tildra-sidebar-status">Error: ${error || 'No content to summarize'}</div>`;
                  return;
                }
                if(tildraSidebarContent) tildraSidebarContent.innerHTML = '<div id="tildra-sidebar-status">Summarizing... (please wait)</div>';

                const originalButtonIcon = tildraFloatingButton.innerHTML;
                tildraFloatingButton.innerHTML = `
                  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
                    <style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_zKoa{animation-delay:-.1s}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}</style>
                    <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
                    <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75A11,11,0,0,0,12,1Z" class="spinner_V8m1"/>
                  </svg>
                `;
                tildraFloatingButton.disabled = true;

                getClerkSessionToken()
                  .then(token => {
                    console.log('[Tildra Content] Sending summarizeAPI message from button click.');
                    try {
                        if (!chrome.runtime || !chrome.runtime.sendMessage) {
                            console.warn('[Tildra Content - Button Click] Bailing: chrome.runtime.sendMessage is not available.');
                            throw new Error('Extension context for chrome.runtime.sendMessage not available for button click.');
                        }
                        chrome.runtime.sendMessage(
                          { action: 'summarizeAPI', textContent: articleText, token, url: window.location.href, title: document.title },
                          (resp) => {
                            tildraFloatingButton.innerHTML = originalButtonIcon;
                            tildraFloatingButton.disabled = false;
    
                            if (chrome.runtime.lastError) {
                              console.error('[Tildra Content - Button Click] sendMessage lastError:', chrome.runtime.lastError.message);
                              if (!chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
                                 if(tildraSidebarContent) tildraSidebarContent.innerHTML = `<div id="tildra-sidebar-status">API Error: ${chrome.runtime.lastError.message}</div>`;
                              }
                              return; // Stop processing
                            }
                            if (typeof resp === 'undefined') {
                                console.warn('[Tildra Content - Button Click] sendMessage undefined response. Context might be closing.');
                                if(tildraSidebarContent) tildraSidebarContent.innerHTML = `<div id="tildra-sidebar-status">Error: No response from API.</div>`;
                                return; // Stop processing
                            }
                            if (!resp || !resp.success) {
                              console.error('[Tildra Content] summarizeAPI response error (button click):', resp);
                              let errorMsg = resp?.error || 'Unknown summarization error';
                              if (resp && resp.expired) errorMsg = 'User session expired. Please log in to tildra.xyz.';
                              if(tildraSidebarContent) tildraSidebarContent.innerHTML = `<div id="tildra-sidebar-status">Error: ${errorMsg}</div>`;
                              return;
                            }
                            displaySummaryInSidebar(resp.summaryData, clickSettings);
                          }
                        );
                    } catch (e) {
                        console.error('[Tildra Content - Button Click] Error sending summarizeAPI message:', e);
                        tildraFloatingButton.innerHTML = originalButtonIcon;
                        tildraFloatingButton.disabled = false;
                        if(tildraSidebarContent) tildraSidebarContent.innerHTML = `<div id="tildra-sidebar-status">Error: ${e.message}</div>`;
                    }
                  })
                  .catch(err => {
                    tildraFloatingButton.innerHTML = originalButtonIcon;
                    tildraFloatingButton.disabled = false;
                    console.error('[Tildra Content] Auth token or other pre-API call error (button click):', err);
                    let authErrorMsg = 'Auth or setup error: ' + err.message;
                    if (err.message === 'Authentication token was not retrieved.') authErrorMsg = 'Could not get auth token. Please log in to tildra.xyz.';
                    if(tildraSidebarContent) tildraSidebarContent.innerHTML = `<div id="tildra-sidebar-status">${authErrorMsg}</div>`;
                  });
            }
        } 
      }); 
    });
}

function manageTildraVisibility(settings) {
  console.log('[Tildra Content] manageTildraVisibility called. Current disableOverlay state:', settings.disableOverlay);
  if (settings.disableOverlay) {
    removeTildraElements();
  } else {
    ensureSidebarExists(); // Ensure sidebar shell is ready if not disabled
    ensureFloatingButtonExists(settings); // Then ensure button (which might create sidebar if needed)
  }
}

// Scroll Sync Logic
let summarySentences = [];

function updateScrollIndicator() {
    if (!tildraSidebar || !tildraSidebar.classList.contains('visible')) return;

    const scrollThumb = document.getElementById('tildra-scroll-indicator-thumb');
    const scrollTrack = document.getElementById('tildra-scroll-indicator-track');
    if (!scrollThumb || !scrollTrack) return;

    const pageScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const pageScrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const pageClientHeight = document.documentElement.clientHeight || document.body.clientHeight;

    if (pageScrollHeight <= pageClientHeight) { // No scrollbar on page
        scrollThumb.style.top = '0px';
        scrollThumb.style.height = scrollTrack.clientHeight + 'px'; // Full height
        return;
    }

    const scrollPercentage = pageScrollTop / (pageScrollHeight - pageClientHeight);
    const trackHeight = scrollTrack.clientHeight;
    const thumbHeight = Math.max(10, trackHeight * (pageClientHeight / pageScrollHeight)); // Thumb height proportional to viewport
    
    scrollThumb.style.height = `${thumbHeight}px`;
    scrollThumb.style.top = `${scrollPercentage * (trackHeight - thumbHeight)}px`;

    // Basic Highlighting (Stage 3 part 1)
    highlightSummaryBasedOnPageScroll(scrollPercentage);
}

function highlightSummaryBasedOnPageScroll(scrollPercentage) {
    if (summarySentences.length === 0) return;

    // Remove existing highlights
    summarySentences.forEach(span => span.classList.remove('summary-sentence-highlighted'));

    // Determine which sentence to highlight
    // This is a very basic heuristic: find the sentence whose segment overlaps with the current scroll percentage.
    const targetIndex = Math.floor(scrollPercentage * summarySentences.length);
    
    if (targetIndex >= 0 && targetIndex < summarySentences.length) {
        summarySentences[targetIndex].classList.add('summary-sentence-highlighted');
    }
}

// Debounce scroll listener for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedScrollHandler = debounce(updateScrollIndicator, 50); // Update at most every 50ms

(function initializeTildraContentScript() {
  console.log("[Tildra Content] Initializing Tildra content script...");
  ensureSidebarExists(); // Create sidebar shell on init regardless of settings, just keep it hidden
  window.addEventListener('scroll', debouncedScrollHandler);

  chrome.storage.local.get(['tildraSettings'], (result) => {
    const initialSettings = result.tildraSettings || { disableOverlay: false }; 
    console.log('[Tildra Content] Initial settings loaded on script start:', initialSettings);
    manageTildraVisibility(initialSettings);
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.tildraSettings) {
      const newSettings = changes.tildraSettings.newValue || { disableOverlay: false };
      console.log('[Tildra Content] Settings changed. New settings:', newSettings);
      manageTildraVisibility(newSettings);

      if (!newSettings.disableOverlay && tildraSidebar) {
        const summaryOverlay = tildraSidebar; // Using tildraSidebar directly
        if (newSettings.overlayBg) summaryOverlay.style.setProperty('background', newSettings.overlayBg, 'important');
        if (newSettings.overlayText) {
            summaryOverlay.style.setProperty('color', newSettings.overlayText, 'important');
            const closeBtn = summaryOverlay.querySelector('#tildra-sidebar-close-btn');
            if (closeBtn) closeBtn.style.setProperty('color', newSettings.overlayText, 'important');
        }
      }
    }
  });
})();

console.log("Tildra Content Script Finished Execution (bottom of script)");
