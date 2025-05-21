// This script is injected into the page to extract the main article content.
// It uses the Readability library (expected to be loaded via manifest.json)

let tildraSidebar = null;
let tildraSidebarContent = null;
let tildraFloatingButton = null;
let summarySentences = [];
let isProgrammaticScroll = false;
let pageScrollMarkerTimeout = null;
let mainPageTextBlocks = [];
let summaryToPageBlockMap = {};
let currentlyHighlightedPageBlock = null;

// Simple list of common English stop words
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can',
    'could', 'may', 'might', 'must', 'am', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our',
    'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'to', 'of', 'in', 'on',
    'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'out',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
]);

function getKeywords(text) {
    if (!text) return new Set();
    const words = text.toLowerCase()
                      .replace(/[^\w\s]/gi, '') 
                      .split(/\s+/);            
    const keywords = new Set(words.filter(word => word.length > 2 && !STOP_WORDS.has(word)));
    // console.log(`[Tildra Keywords] Text: "${text.substring(0,30)}..." Keywords:`, Array.from(keywords).join(', '));
    return keywords;
}

function extractTextBlocksFromMainContent() {
    mainPageTextBlocks = [];
    let articleContent = document.querySelector('article');
    if (!articleContent) {
        articleContent = document.querySelector('main') || 
                         document.querySelector('[role="main"]') || 
                         document.body;
    }
    console.log('[Tildra Content] extractTextBlocks: Using articleContent element:', articleContent);

    const selectors = 'p, h1, h2, h3, h4, h5, h6, li, td, pre';
    const elements = articleContent.querySelectorAll(selectors);
    console.log(`[Tildra Content] extractTextBlocks: Found ${elements.length} raw elements with selectors.`);

    elements.forEach((el, index) => {
        const text = el.textContent?.trim();
        if (text && text.length > 30) { // Reduced length filter slightly for more potential blocks
            const keywords = getKeywords(text);
            mainPageTextBlocks.push({ 
                id: `tildra-block-${index}`,
                element: el, 
                text: text,
                keywords: keywords
            });
            el.setAttribute('data-tildra-block-id', `tildra-block-${index}`);
        } else if (text) {
            // console.log(`[Tildra Content] extractTextBlocks: Skipping short text block (length ${text.length}): "${text.substring(0, 50)}..."`);
        }
    });
    console.log(`[Tildra Content] Extracted ${mainPageTextBlocks.length} text blocks from main content.`);
    if (mainPageTextBlocks.length > 0) {
        console.log("[Tildra Content] Sample page blocks (first 3):");
        mainPageTextBlocks.slice(0, 3).forEach(b => {
            console.log(`  ID: ${b.id}, Text: "${b.text.substring(0,70)}...", Keywords: ${Array.from(b.keywords).join(', ')}`);
        });
    }
}

function buildSummaryToPageBlockMap() {
    summaryToPageBlockMap = {};
    console.log('[Tildra Content] buildSummaryToPageBlockMap: Starting. Summary sentences count:', summarySentences.length, 'Page blocks count:', mainPageTextBlocks.length);
    if (summarySentences.length === 0 || mainPageTextBlocks.length === 0) {
        console.warn('[Tildra Content] buildSummaryToPageBlockMap: No summary sentences or page blocks to map.');
        return;
    }

    summarySentences.forEach(summarySpan => {
        const summaryIndex = summarySpan.dataset.summarySentenceIndex;
        const summaryText = summarySpan.textContent;
        const summaryKeywords = getKeywords(summaryText);
        console.log(`[Tildra Content] buildMap: Summary Idx ${summaryIndex}, Text: "${summaryText.substring(0,50)}...", Keywords: ${Array.from(summaryKeywords).join(', ')}`);

        if (summaryKeywords.size === 0) {
            console.log(`[Tildra Content] buildMap: No keywords for summary index ${summaryIndex}, skipping.`);
            return;
        }

        let bestMatch = { score: -1, blockIds: [] }; // Initialize score to -1 to ensure any match is better

        mainPageTextBlocks.forEach(pageBlock => {
            if (!pageBlock.keywords || pageBlock.keywords.size === 0) return; // Skip page blocks with no keywords
            
            const commonKeywords = new Set([...summaryKeywords].filter(kw => pageBlock.keywords.has(kw)));
            let score = commonKeywords.size;
            // Basic density bonus: (common keywords / summary keywords length) + (common keywords / page block keywords length)
            // This can help differentiate blocks that have the same number of common keywords but are more specific.
            if (score > 0) {
                score += (commonKeywords.size / summaryKeywords.size) + (commonKeywords.size / pageBlock.keywords.size);
            }

            // console.log(`  [Tildra Content] buildMap: Comparing with Page Block ID ${pageBlock.id} (KW count: ${pageBlock.keywords.size}). Common: ${Array.from(commonKeywords).join(', ')}, Score: ${score.toFixed(2)}`);

            if (score > bestMatch.score) {
                bestMatch.score = score;
                bestMatch.blockIds = [pageBlock.id]; 
            } else if (score > 0 && score === bestMatch.score) { // Only add to blockIds if score is same AND positive
                bestMatch.blockIds.push(pageBlock.id);
            }
        });

        if (bestMatch.score > 0) { // Only map if there's a positive score
            summaryToPageBlockMap[summaryIndex] = bestMatch.blockIds;
            console.log(`[Tildra Content] buildMap: Mapped summary index ${summaryIndex} to page block(s) ${bestMatch.blockIds.join(', ')} with score ${bestMatch.score.toFixed(2)}`);
        } else {
            console.log(`[Tildra Content] buildMap: No positive match found for summary index ${summaryIndex}.`);
        }
    });
    console.log('[Tildra Content] Finished building summary to page block map:', JSON.parse(JSON.stringify(summaryToPageBlockMap)));
}

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

    /* Viewport Scroll Marker */
    #tildra-page-scroll-marker {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: rgba(124, 58, 237, 0.1) !important; /* Faint accent color */
        z-index: 2147483640 !important; /* High, but below Tildra UI */
        opacity: 0;
        pointer-events: none; /* Allow clicks to pass through */
        transition: opacity 0.3s ease-in-out !important;
    }
    #tildra-page-scroll-marker.visible {
        opacity: 1;
    }

    /* Highlight for main page text block */
    .tildra-main-page-block-highlighted {
        background-color: rgba(124, 58, 237, 0.15) !important; /* Slightly more visible than marker */
        box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3) !important;
        border-radius: 3px;
        transition: background-color 0.3s ease, box-shadow 0.3s ease;
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

    .summary-sentence-clickable {
        cursor: pointer;
    }
    .summary-sentence-clickable:hover {
        text-decoration: underline;
    }
  `;
  document.head.appendChild(style);
})();

// Function to create the sidebar if it doesn't exist
function ensureSidebarExists() {
    if (document.getElementById('tildra-sidebar')) {
        // If sidebar already exists, ensure our global var for content area is set
        if (!tildraSidebarContent) tildraSidebarContent = document.getElementById('tildra-sidebar-content');
        // And attach scroll listener if not already attached by init (e.g. if sidebar was recreated)
        if (tildraSidebarContent && !tildraSidebarContent.hasAttribute('data-scroll-listener-attached')) {
            tildraSidebarContent.addEventListener('scroll', debouncedSidebarScrollHandler);
            tildraSidebarContent.setAttribute('data-scroll-listener-attached', 'true');
        }
        return;
    }

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
    tildraSidebarContent.addEventListener('scroll', debouncedSidebarScrollHandler);
    tildraSidebarContent.setAttribute('data-scroll-listener-attached', 'true');
    
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
    // It is possible that ensureSidebarExists was called but tildraSidebarContent wasn't found
    // or the listener wasn't attached, especially if the sidebar was quickly removed and re-added.
    // So, ensure the listener is attached here as well if needed.
    if (tildraSidebarContent && !tildraSidebarContent.hasAttribute('data-scroll-listener-attached')) {
        tildraSidebarContent.addEventListener('scroll', debouncedSidebarScrollHandler);
        tildraSidebarContent.setAttribute('data-scroll-listener-attached', 'true');
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
        span.classList.add('summary-sentence-clickable');
        span.addEventListener('click', handleSummarySentenceClick);
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
        span.classList.add('summary-sentence-clickable');
        span.addEventListener('click', handleSummarySentenceClick);
        li.appendChild(span);
        keyPointsUl.appendChild(li);
        summarySentences.push(span);
    });
    tildraSidebarContent.appendChild(keyPointsUl);
    
    // After summary sentences are created and pushed to summarySentences array:
    extractTextBlocksFromMainContent(); // Ensure this call is active and present
    buildSummaryToPageBlockMap(); // Build the map

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
function showPageScrollMarker(caller) {
    console.log(`[Tildra Content] showPageScrollMarker called by: ${caller}`);
    // console.trace(); // Uncomment for full stack trace if needed

    let marker = document.getElementById('tildra-page-scroll-marker');
    if (!marker) {
        marker = document.createElement('div');
        marker.id = 'tildra-page-scroll-marker';
        document.body.appendChild(marker);
    }

    // Clear any existing timeout to handle rapid calls
    if (pageScrollMarkerTimeout) {
        clearTimeout(pageScrollMarkerTimeout);
    }

    marker.classList.add('visible');

    pageScrollMarkerTimeout = setTimeout(() => {
        marker.classList.remove('visible');
    }, 700); // Marker visible for 700ms
}

function updateScrollIndicator() {
    if (isProgrammaticScroll) {
        console.log('[Tildra Content] updateScrollIndicator: Ignoring programmatic scroll event.');
        return;
    }

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

    highlightSummaryBasedOnPageScroll();
}

function highlightSummaryBasedOnPageScroll() {
    if (summarySentences.length === 0 || mainPageTextBlocks.length === 0) return;

    // Remove highlight from previously highlighted main page block
    if (currentlyHighlightedPageBlock && currentlyHighlightedPageBlock.element) {
        currentlyHighlightedPageBlock.element.classList.remove('tildra-main-page-block-highlighted');
    }
    // currentlyHighlightedPageBlock will be updated if a new block is highlighted

    summarySentences.forEach(span => span.classList.remove('summary-sentence-highlighted'));

    let bestCandidate = { blockId: null, textStart: '', score: -1 };
    const viewportCenterY = window.innerHeight / 2;

    mainPageTextBlocks.forEach(block => {
        if (!block || !block.element || typeof block.element.getBoundingClientRect !== 'function') return;
        const rect = block.element.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        const visibilityPercentageInViewport = visibleHeight / viewportHeight; // How much of the viewport it occupies
        const elementVisiblePercentage = rect.height > 0 ? visibleHeight / rect.height : 0; // How much of the element itself is visible

        // Basic score: combination of visibility and proximity to center
        let currentScore = 0;
        if (elementVisiblePercentage > 0.1) { // Must be at least 10% visible
            currentScore = elementVisiblePercentage * 0.7; // Base score on how much of element is visible
            const elementCenterY = rect.top + rect.height / 2;
            const distanceToCenter = Math.abs(viewportCenterY - elementCenterY);
            const proximityBonus = Math.max(0, 1 - (distanceToCenter / viewportCenterY)) * 0.3; // Bonus for being close to center
            currentScore += proximityBonus;
        }
        
        // Prefer blocks that are actually mapped to a summary sentence
        let isMapped = false;
        for (const summaryIdx in summaryToPageBlockMap) {
            if (summaryToPageBlockMap[summaryIdx].includes(block.id)) {
                isMapped = true;
                break;
            }
        }
        if (isMapped) {
            currentScore += 0.2; // Add a bonus if the block is in our map
        }

        if (currentScore > bestCandidate.score) {
            bestCandidate.score = currentScore;
            bestCandidate.blockId = block.id;
            bestCandidate.textStart = block.text.substring(0, 50) + '...';
        }
    });

    console.log(`[Tildra Content] highlightSummary: Best candidate block ID: ${bestCandidate.blockId}, Text: "${bestCandidate.textStart}", Score: ${bestCandidate.score.toFixed(2)}`);

    if (bestCandidate.blockId) {
        const newMainPageHighlightBlock = mainPageTextBlocks.find(b => b.id === bestCandidate.blockId);
        if (newMainPageHighlightBlock && newMainPageHighlightBlock.element) {
            newMainPageHighlightBlock.element.classList.add('tildra-main-page-block-highlighted');
            currentlyHighlightedPageBlock = newMainPageHighlightBlock;
        }

        for (const summaryIdx in summaryToPageBlockMap) {
            if (summaryToPageBlockMap[summaryIdx].includes(bestCandidate.blockId)) {
                const summarySpan = summarySentences.find(s => s.dataset.summarySentenceIndex === summaryIdx);
                if (summarySpan) {
                    summarySpan.classList.add('summary-sentence-highlighted');
                    console.log(`[Tildra Content] highlightSummary: Highlighting summary index ${summaryIdx} (maps to block ${bestCandidate.blockId})`);
                }
            }
        }
    } else {
        // console.log("[Tildra Content] highlightSummary: No suitable block found to determine highlight.");
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

const debouncedScrollHandler = debounce(updateScrollIndicator, 100); // Adjusted debounce timing

function handleSidebarScroll() {
    if (!tildraSidebar || !tildraSidebar.classList.contains('visible') || summarySentences.length === 0) return;
    if (!tildraSidebarContent) return;

    const sidebarScrollTop = tildraSidebarContent.scrollTop;
    const sidebarScrollHeight = tildraSidebarContent.scrollHeight;
    const sidebarClientHeight = tildraSidebarContent.clientHeight;

    console.log(`[Tildra Content] handleSidebarScroll: Sidebar scrolled. Top: ${sidebarScrollTop}`);

    if (sidebarScrollHeight <= sidebarClientHeight) return; 

    let topSentenceIndex = -1;
    let minOffsetTop = Infinity;

    for (let i = 0; i < summarySentences.length; i++) {
        const sentenceSpan = summarySentences[i];
        const offset = sentenceSpan.offsetTop - sidebarScrollTop;
        if (offset >= -10 && offset < minOffsetTop) { 
            minOffsetTop = offset;
            topSentenceIndex = i;
        } else if (offset < -10 && i === summarySentences.length -1 && topSentenceIndex === -1) {
            topSentenceIndex = i;
        }
    }
    
    console.log(`[Tildra Content] handleSidebarScroll: Determined topSentenceIndex: ${topSentenceIndex}`);

    if (topSentenceIndex !== -1) {
        const mappedBlockIds = summaryToPageBlockMap[String(topSentenceIndex)];
        if (mappedBlockIds && mappedBlockIds.length > 0) {
            const targetBlockId = mappedBlockIds[0]; // Use the first mapped block
            const targetBlock = mainPageTextBlocks.find(b => b.id === targetBlockId);

            if (targetBlock && targetBlock.element) {
                console.log(`[Tildra Content] handleSidebarScroll: Scrolling to page block ID: ${targetBlockId}, Text start: "${targetBlock.text.substring(0,50)}..."`);
                isProgrammaticScroll = true;
                console.log('[Tildra Content] handleSidebarScroll: Setting isProgrammaticScroll = true');
                
                targetBlock.element.scrollIntoView({ behavior: 'auto', block: 'start' });
                showPageScrollMarker('handleSidebarScroll_BlockScroll'); // Log caller

                setTimeout(() => {
                    if (!document.body || !document.documentElement) {
                        console.warn('[Tildra Content] handleSidebarScroll setTimeout: Document context seems invalid, skipping updateScrollIndicator.');
                        isProgrammaticScroll = false; // Still reset the flag
                        return;
                    }
                    isProgrammaticScroll = false;
                    console.log('[Tildra Content] handleSidebarScroll: Reset isProgrammaticScroll = false after delay');
                    updateScrollIndicator(); 
                }, 250); 
            } else {
                 console.log(`[Tildra Content] handleSidebarScroll: Target block for ID ${targetBlockId} not found or element missing. Falling back.`);
                 fallbackToPercentageScroll(topSentenceIndex); 
            }
        } else {
            console.log(`[Tildra Content] handleSidebarScroll: No page block mapped for summary index ${topSentenceIndex}. Falling back.`);
            fallbackToPercentageScroll(topSentenceIndex); // Fallback if no mapping found
        }
    }
}

function fallbackToPercentageScroll(topSentenceIndex) {
    const pageScrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const pageClientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    
    if (pageScrollHeight > pageClientHeight) {
        const targetPageScroll = (topSentenceIndex / summarySentences.length) * (pageScrollHeight - pageClientHeight);
        console.log(`[Tildra Content] handleSidebarScroll (fallback): Calculated targetPageScroll: ${targetPageScroll}`);
        
        isProgrammaticScroll = true;
        console.log('[Tildra Content] handleSidebarScroll: Setting isProgrammaticScroll = true');

        window.scrollTo({
            top: targetPageScroll,
            behavior: 'auto' 
        });
        
        showPageScrollMarker('handleSidebarScroll_FallbackScroll'); // Log caller

        // Reset the flag after a short delay, allowing the programmatic scroll event to be processed (and ignored)
        setTimeout(() => {
            isProgrammaticScroll = false;
            console.log('[Tildra Content] handleSidebarScroll: Reset isProgrammaticScroll = false after delay');
            // Manually call updateScrollIndicator here to ensure the highlight and indicator are correct *after* the programmatic scroll and flag reset.
            // This avoids relying on a user scroll event to fix the state.
            updateScrollIndicator();
        }, 200); // Increased delay slightly
    }
}

const debouncedSidebarScrollHandler = debounce(handleSidebarScroll, 100); 

function handleSummarySentenceClick(event) {
    const summarySpan = event.currentTarget;
    const summaryIndex = summarySpan.dataset.summarySentenceIndex;

    console.log(`[Tildra Content] Summary sentence clicked: Index ${summaryIndex}`);

    if (summaryIndex && summaryToPageBlockMap[summaryIndex]) {
        const targetBlockIds = summaryToPageBlockMap[summaryIndex];
        if (targetBlockIds && targetBlockIds.length > 0) {
            // For now, just scroll to the first mapped block.
            // Could be enhanced to scroll to the "best" or offer choices if multiple.
            const targetBlockId = targetBlockIds[0];
            const targetBlock = mainPageTextBlocks.find(b => b.id === targetBlockId);

            if (targetBlock && targetBlock.element) {
                console.log(`[Tildra Content] Scrolling to page block ID: ${targetBlockId} from summary click.`);
                isProgrammaticScroll = true; // Prevent immediate highlight feedback loop from this scroll
                targetBlock.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight the target block on the main page
                if (currentlyHighlightedPageBlock && currentlyHighlightedPageBlock.element) {
                    currentlyHighlightedPageBlock.element.classList.remove('tildra-main-page-block-highlighted');
                }
                targetBlock.element.classList.add('tildra-main-page-block-highlighted');
                currentlyHighlightedPageBlock = targetBlock;

                // Also re-highlight this specific summary sentence in the sidebar (and remove others)
                summarySentences.forEach(span => span.classList.remove('summary-sentence-highlighted'));
                summarySpan.classList.add('summary-sentence-highlighted');

                showPageScrollMarker('handleSummarySentenceClick');

                setTimeout(() => {
                    isProgrammaticScroll = false;
                    // updateScrollIndicator(); // Optionally update indicator if needed after click-scroll
                }, 250); // Allow scroll to finish
            } else {
                console.warn(`[Tildra Content] Target block element not found for ID: ${targetBlockId}`);
            }
        } else {
            console.warn(`[Tildra Content] No block IDs mapped for summary index: ${summaryIndex}`);
        }
    } else {
        console.warn(`[Tildra Content] No map entry for summary index: ${summaryIndex}`);
    }
}

(function initializeTildraContentScript() {
  console.log("[Tildra Content] Initializing Tildra content script...");
  ensureSidebarExists(); 
  window.addEventListener('scroll', debouncedScrollHandler);
  if (tildraSidebarContent) { 
    tildraSidebarContent.addEventListener('scroll', debouncedSidebarScrollHandler);
    tildraSidebarContent.setAttribute('data-scroll-listener-attached', 'true');
  } else {
    setTimeout(() => {
        if (tildraSidebarContent) {
            tildraSidebarContent.addEventListener('scroll', debouncedSidebarScrollHandler);
            tildraSidebarContent.setAttribute('data-scroll-listener-attached', 'true');
        }
    }, 100);
  }

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
