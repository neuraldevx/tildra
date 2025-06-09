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
let currentSettings = { enableHighlighting: true }; // Placeholder for actual settings retrieval

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
      width: 380px !important; /* Increased width for better readability */
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
        background-color: rgba(124, 58, 237, 0.01) !important; /* ULTRA-LOW OPACITY */
        z-index: 2147483640 !important; /* High, but below Tildra UI */
        opacity: 0;
        pointer-events: none; /* Allow clicks to pass through */
        transition: opacity 0.05s ease-in-out !important; /* ULTRA-FAST TRANSITION */
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

const API_URL = 'https://tildra.fly.dev/summarize'; // Production API
const API_BASE_URL = 'https://tildra.fly.dev'; // Base URL for job copilot APIs
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
                  isProcessing = false; // Reset processing flag
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
                              if (resp && resp.isRateLimit) errorMsg = '⏱️ Too many requests. Please wait before trying again.';
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
  console.log('[Tildra Content] manageTildraVisibility called. Settings: ', settings);
  // Ensure currentSettings always has a defined enableHighlighting property
  currentSettings = {
    ...settings, // Spread existing settings
    enableHighlighting: settings.enableHighlighting !== false // Default to true if undefined or not explicitly false
  };
  console.log('[Tildra Content] manageTildraVisibility: Updated currentSettings:', currentSettings);

  if (currentSettings.disableOverlay) {
    removeTildraElements();
  } else {
    ensureSidebarExists(); 
    ensureFloatingButtonExists(settings); 
  }

  // If highlighting has just been disabled, clear existing highlights
  if (currentSettings.enableHighlighting === false) {
    if (currentlyHighlightedPageBlock && currentlyHighlightedPageBlock.element) {
        currentlyHighlightedPageBlock.element.classList.remove('tildra-main-page-block-highlighted');
    }
    summarySentences.forEach(span => span.classList.remove('summary-sentence-highlighted'));
    console.log('[Tildra Content] manageTildraVisibility: Highlighting disabled, cleared existing highlights.');
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
    }, 50); // Marker visible for 50ms - ULTRA-SHORT DURATION
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
    if (currentSettings && currentSettings.enableHighlighting === false) {
        // If highlighting is disabled, remove any existing highlights and do nothing further.
        if (currentlyHighlightedPageBlock && currentlyHighlightedPageBlock.element) {
            currentlyHighlightedPageBlock.element.classList.remove('tildra-main-page-block-highlighted');
        }
        summarySentences.forEach(span => span.classList.remove('summary-sentence-highlighted'));
        console.log('[Tildra Content] Highlighting disabled. Cleared existing highlights.');
        return;
    }

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
            // Apply highlight only if enabled (double check, though primary check is at function start)
            if (!currentSettings || currentSettings.enableHighlighting !== false) {
                newMainPageHighlightBlock.element.classList.add('tildra-main-page-block-highlighted');
                currentlyHighlightedPageBlock = newMainPageHighlightBlock;
            }
        }

        for (const summaryIdx in summaryToPageBlockMap) {
            if (summaryToPageBlockMap[summaryIdx].includes(bestCandidate.blockId)) {
                const summarySpan = summarySentences.find(s => s.dataset.summarySentenceIndex === summaryIdx);
                if (summarySpan) {
                    // Apply highlight only if enabled
                    if (!currentSettings || currentSettings.enableHighlighting !== false) {
                        summarySpan.classList.add('summary-sentence-highlighted');
                    }
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
                console.log(`[Tildra Content] handleSidebarScroll: Top sentence maps to page block ID: ${targetBlockId}, Text start: "${targetBlock.text.substring(0,50)}..." (Main page scroll is now disabled for this action)`);
                // isProgrammaticScroll = true; // NO LONGER SETTING THIS
                // console.log('[Tildra Content] handleSidebarScroll: Setting isProgrammaticScroll = true');
                
                // targetBlock.element.scrollIntoView({ behavior: 'auto', block: 'start' }); // SCROLLING DISABLED
                // showPageScrollMarker('handleSidebarScroll_BlockScroll'); // MARKER DISABLED

                // setTimeout(() => { // TIMEOUT NO LONGER NEEDED FOR THIS PATH
                //     if (!document.body || !document.documentElement) {
                //         console.warn('[Tildra Content] handleSidebarScroll setTimeout: Document context seems invalid, skipping updateScrollIndicator.');
                //         // isProgrammaticScroll = false; // Still reset the flag
                //         return;
                //     }
                //     isProgrammaticScroll = false;
                //     console.log('[Tildra Content] handleSidebarScroll: Reset isProgrammaticScroll = false after delay');
                //     updateScrollIndicator(); 
                // }, 250); 
            } else {
                 console.log(`[Tildra Content] handleSidebarScroll: Target block for ID ${targetBlockId} not found or element missing. (Main page scroll disabled)`);
                 // fallbackToPercentageScroll(topSentenceIndex); // FALLBACK SCROLLING DISABLED
            }
        } else {
            console.log(`[Tildra Content] handleSidebarScroll: No page block mapped for summary index ${topSentenceIndex}. (Main page scroll disabled)`);
            // fallbackToPercentageScroll(topSentenceIndex); // FALLBACK SCROLLING DISABLED
        }
    }
}

function fallbackToPercentageScroll(topSentenceIndex) {
    // THIS ENTIRE FUNCTION'S PURPOSE WAS TO SCROLL THE MAIN PAGE.
    // SINCE THAT BEHAVIOR IS NOW DISABLED WHEN CALLED FROM handleSidebarScroll,
    // THIS FUNCTION IS EFFECTIVELY NO LONGER TRIGGERED IN A WAY THAT SCROLLS THE PAGE FROM SIDEBAR SCROLL.
    // WE LEAVE THE FUNCTION DEFINITION IN CASE IT'S USED ELSEWHERE OR FOR FUTURE FEATURES,
    // BUT ITS CORE SCROLLING LOGIC WON'T BE REACHED FROM handleSidebarScroll.

    console.log(`[Tildra Content] fallbackToPercentageScroll called for topSentenceIndex: ${topSentenceIndex}. (Main page scroll is disabled for this path)`);

    // const pageScrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    // const pageClientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    
    // if (pageScrollHeight > pageClientHeight) {
    //     const targetPageScroll = (topSentenceIndex / summarySentences.length) * (pageScrollHeight - pageClientHeight);
    //     console.log(`[Tildra Content] fallbackToPercentageScroll: Calculated targetPageScroll: ${targetPageScroll}`);
        
    //     isProgrammaticScroll = true; 
    //     console.log('[Tildra Content] fallbackToPercentageScroll: Setting isProgrammaticScroll = true');

    //     window.scrollTo({
    //         top: targetPageScroll,
    //         behavior: 'auto' 
    //     });
        
    //     showPageScrollMarker('handleSidebarScroll_FallbackScroll');

    //     setTimeout(() => {
    //         isProgrammaticScroll = false;
    //         console.log('[Tildra Content] fallbackToPercentageScroll: Reset isProgrammaticScroll = false after delay');
    //         updateScrollIndicator();
    //     }, 200); 
    // }
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
                isProgrammaticScroll = true; 
                targetBlock.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Apply highlights only if enabled
                if (!currentSettings || currentSettings.enableHighlighting !== false) {
                    if (currentlyHighlightedPageBlock && currentlyHighlightedPageBlock.element) {
                        currentlyHighlightedPageBlock.element.classList.remove('tildra-main-page-block-highlighted');
                    }
                    targetBlock.element.classList.add('tildra-main-page-block-highlighted');
                    currentlyHighlightedPageBlock = targetBlock;

                    summarySentences.forEach(span => span.classList.remove('summary-sentence-highlighted'));
                    summarySpan.classList.add('summary-sentence-highlighted');
                    console.log('[Tildra Content] Highlights applied on summary click.');
                } else {
                    console.log('[Tildra Content] Highlighting disabled for summary click. Scroll only.');
                }

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
    const loadedSettings = result.tildraSettings || {};
    // Explicitly initialize currentSettings with a default for enableHighlighting
    currentSettings = {
        disableOverlay: loadedSettings.disableOverlay === true, // Default to false
        enableHighlighting: loadedSettings.enableHighlighting !== false, // Default to true
        // Copy other settings as they are
        overlayBg: loadedSettings.overlayBg,
        overlayText: loadedSettings.overlayText,
        theme: loadedSettings.theme,
        accentColor: loadedSettings.accentColor,
        popupBg: loadedSettings.popupBg,
        popupText: loadedSettings.popupText
    };
    console.log('[Tildra Content] Initial settings processed into currentSettings:', currentSettings);
    manageTildraVisibility(currentSettings); // Pass the processed currentSettings
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.tildraSettings) {
      const newStorageSettings = changes.tildraSettings.newValue || {};
      // Process new settings similarly to ensure enableHighlighting defaults correctly
      const processedNewSettings = {
        disableOverlay: newStorageSettings.disableOverlay === true,
        enableHighlighting: newStorageSettings.enableHighlighting !== false,
        overlayBg: newStorageSettings.overlayBg,
        overlayText: newStorageSettings.overlayText,
        theme: newStorageSettings.theme,
        accentColor: newStorageSettings.accentColor,
        popupBg: newStorageSettings.popupBg,
        popupText: newStorageSettings.popupText
      };
      console.log('[Tildra Content] Settings changed in storage. Processed new settings:', processedNewSettings);
      manageTildraVisibility(processedNewSettings);

      if (!processedNewSettings.disableOverlay && tildraSidebar) {
        const summaryOverlay = tildraSidebar; // Using tildraSidebar directly
        if (processedNewSettings.overlayBg) summaryOverlay.style.setProperty('background', processedNewSettings.overlayBg, 'important');
        if (processedNewSettings.overlayText) {
            summaryOverlay.style.setProperty('color', processedNewSettings.overlayText, 'important');
            const closeBtn = summaryOverlay.querySelector('#tildra-sidebar-close-btn');
            if (closeBtn) closeBtn.style.setProperty('color', processedNewSettings.overlayText, 'important');
        }
      }
    }
  });
})();

// --- ADDED: Dashboard Communication for History ---
// Listen for history requests from the dashboard
window.addEventListener('tildra-request-history', async (event) => {
  console.log('[Tildra Content] Received history request from dashboard');
  try {
    // Send message to background script to get history
    chrome.runtime.sendMessage({ action: 'getHistory' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Tildra Content] Error getting history:', chrome.runtime.lastError);
        // Send empty response
        const responseEvent = new CustomEvent('tildra-history-response', {
          detail: { history: [] }
        });
        window.dispatchEvent(responseEvent);
      } else if (response && response.success) {
        console.log('[Tildra Content] Sending history to dashboard:', response.history.length, 'items');
        // Send history back to dashboard
        const responseEvent = new CustomEvent('tildra-history-response', {
          detail: { history: response.history }
        });
        window.dispatchEvent(responseEvent);
      } else {
        console.log('[Tildra Content] No history available');
        // Send empty response
        const responseEvent = new CustomEvent('tildra-history-response', {
          detail: { history: [] }
        });
        window.dispatchEvent(responseEvent);
      }
    });
  } catch (error) {
    console.error('[Tildra Content] Error handling history request:', error);
    // Send empty response on error
    const responseEvent = new CustomEvent('tildra-history-response', {
      detail: { history: [] }
    });
    window.dispatchEvent(responseEvent);
  }
});

// Listen for delete requests from the dashboard
window.addEventListener('tildra-delete-summary', async (event) => {
  console.log('[Tildra Content] Received delete request from dashboard');
  const summaryId = event.detail?.summaryId;
  if (!summaryId) {
    console.error('[Tildra Content] No summary ID provided for deletion');
    return;
  }
  
  try {
    // Send message to background script to delete summary
    chrome.runtime.sendMessage({ action: 'deleteSummary', summaryId: summaryId }, (response) => {
      const responseEvent = new CustomEvent('tildra-delete-response', {
        detail: { 
          success: response?.success || false, 
          summaryId: summaryId 
        }
      });
      window.dispatchEvent(responseEvent);
    });
  } catch (error) {
    console.error('[Tildra Content] Error handling delete request:', error);
    const responseEvent = new CustomEvent('tildra-delete-response', {
      detail: { success: false, summaryId: summaryId }
    });
    window.dispatchEvent(responseEvent);
  }
});

// Listen for clear all requests from the dashboard
window.addEventListener('tildra-clear-all-history', async (event) => {
  console.log('[Tildra Content] Received clear all request from dashboard');
  try {
    chrome.runtime.sendMessage({ action: 'clearAllHistory' }, (response) => {
      const responseEvent = new CustomEvent('tildra-clear-all-response', {
        detail: { success: response?.success || false }
      });
      window.dispatchEvent(responseEvent);
    });
  } catch (error) {
    console.error('[Tildra Content] Error handling clear all request:', error);
    const responseEvent = new CustomEvent('tildra-clear-all-response', {
      detail: { success: false }
    });
    window.dispatchEvent(responseEvent);
  }
});
// --- END ADDED ---

console.log("Tildra Content Script Finished Execution (bottom of script)");

// NEW: Job Page Detection and Scraping Logic
const JOB_BOARD_PATTERNS = {
    LINKEDIN: /linkedin\.com\/jobs\/(view|collections)\//,
    INDEED: /indeed\.com\/(viewjob|jobs)/,
    GREENHOUSE: /boards\.greenhouse\.io\//,
    LEVER: /\.lever\.co\//, // Matches domains ending in .lever.co
    ASHBYHQ: /jobs\.ashbyhq\.com\//,
    GLASSDOOR: /glassdoor\.com\/Job\//,
    // ATS Platforms
    TALEO: /\.taleo\.net\/careersection/,
    WORKDAY: /(workdayjobs\.com|myworkdayjobs\.com)\/.*\/job\//,
    SUCCESSFACTORS: /\.successfactors\.com\/.*\/job\//,
    SMARTRECRUITERS: /\.smartrecruiters\.com\/.*\/jobs\//,
    ICIMS: /\.icims\.com\/jobs\//,
    BAMBOOHR: /\.bamboohr\.com\/jobs\//,
    JOBVITE: /\.jobvite\.com\/.*\/job\//,
    BREEZY: /\.breezy\.hr\/.*\/position\//,
    WORKABLE: /\.workable\.com\/.*\/j\//,
    RECRUITEE: /\.recruitee\.com\/.*\/o\//,
    BRASSRING: /ats\.brassring\.com\/.*\/jobdetails/,
    ULTIPRO: /\.ultipro\.com\/.*\/candidates/,
    // Job Boards
    ZIPRECRUITER: /ziprecruiter\.com\/jobs\//,
    MONSTER: /monster\.com\/job-openings\//,
    CAREERBUILDER: /careerbuilder\.com\/job\//,
    DICE: /dice\.com\/jobs\/detail\//,
    ANGEL: /(angel\.co|wellfound\.com)\/.*\/jobs\//,
    STACKOVERFLOW: /stackoverflow\.com\/jobs\//,
    // Company Career Pages
    GOOGLE_CAREERS: /careers\.google\.com\/jobs\//,
    APPLE_CAREERS: /jobs\.apple\.com\/.*\/details/,
    MICROSOFT_CAREERS: /careers\.microsoft\.com\/.*\/job\//,
    AMAZON_CAREERS: /amazon\.jobs\/.*\/jobs\//,
    NETFLIX_CAREERS: /careers\.netflix\.com\/jobs\//
};

function getCurrentJobBoard() {
    const url = document.URL;
    for (const board in JOB_BOARD_PATTERNS) {
        if (JOB_BOARD_PATTERNS[board].test(url)) {
            console.log(`[Tildra Job Copilot] Matched board pattern: ${board} for URL: ${url}`);
            return board;
        }
    }
    return null;
}

async function scrapeLinkedInJob() {
    console.log('[Tildra Job Copilot] Attempting to scrape LinkedIn job page...');
    // Wait for key elements to be available, especially for dynamic loading
    await new Promise(resolve => setTimeout(resolve, 500)); // Initial small delay

    const jobTitle = document.querySelector('.jobs-unified-top-card__job-title')?.textContent.trim();
    const companyName = document.querySelector('.jobs-unified-top-card__company-name a')?.textContent.trim() || document.querySelector('a[href*="linkedin.com/company/"]')?.textContent.trim();
    
    let jobDescription = null;
    const jdElementComplex = document.querySelector('.jobs-description-content__text[data-view-name="jobDescription"] .display-flex.flex-column .t-14');
    if (jdElementComplex) {
        jobDescription = jdElementComplex.innerText.trim();
    } else {
        // Fallback for potentially simpler structures or if above selector fails
        const jdElementSimple = document.querySelector('#job-details') || document.querySelector('.jobs-description__content');
        if (jdElementSimple) {
            jobDescription = jdElementSimple.innerText.trim();
        }
    }

    if (jobTitle && companyName && jobDescription) {
        console.log('[Tildra Job Copilot] Successfully scraped LinkedIn:', { jobTitle, companyName, jobDescriptionLength: jobDescription.length });
        return { jobTitle, companyName, jobDescription, source: 'LinkedIn' };
    }
    console.warn('[Tildra Job Copilot] Could not scrape all details from LinkedIn page. Found:', { jobTitle, companyName, jobDescriptionExists: !!jobDescription });
    return null;
}

async function scrapeIndeedJob() {
    console.log('[Tildra Job Copilot] Attempting to scrape Indeed job page...');
    await new Promise(resolve => setTimeout(resolve, 500)); 

    const jobTitle = document.querySelector('.jobsearch-JobInfoHeader-title')?.textContent.trim();
    const companyName = document.querySelector('[data-company-name="true"]')?.textContent.trim() || document.querySelector('.jobsearch-CompanyReview--header')?.textContent.trim();
    const jobDescription = document.querySelector('#jobDescriptionText')?.innerText.trim();

    if (jobTitle && companyName && jobDescription) {
        console.log('[Tildra Job Copilot] Successfully scraped Indeed:', { jobTitle, companyName, jobDescriptionLength: jobDescription.length });
        return { jobTitle, companyName, jobDescription, source: 'Indeed' };
    }
    console.warn('[Tildra Job Copilot] Could not scrape all details from Indeed page. Found:', { jobTitle, companyName, jobDescriptionExists: !!jobDescription });
    return null;
}

async function scrapeGreenhouseJob() {
    console.log('[Tildra Job Copilot] Attempting to scrape Greenhouse job page...');
    await new Promise(resolve => setTimeout(resolve, 500)); 

    const jobTitle = document.querySelector('#header h1.app-title')?.textContent.trim() || document.querySelector('h1[data-qa="job-name"]')?.textContent.trim();
    let companyName = document.querySelector('#header #logo + .company-name')?.textContent.trim() || document.querySelector('#logo img[alt]')?.getAttribute('alt') || document.querySelector('#logo')?.textContent.trim();
    if (companyName && companyName.toLowerCase().includes('logo')) companyName = companyName.replace(/logo/i, '').trim();
    
    const jobDescription = document.querySelector('#content[role="main"]')?.innerText.trim() || document.querySelector('#content')?.innerText.trim();

    if (jobTitle && jobDescription) {
        console.log('[Tildra Job Copilot] Successfully scraped Greenhouse:', { jobTitle, companyName, jobDescriptionLength: jobDescription.length });
        return { jobTitle, companyName: companyName || "N/A (check Greenhouse page structure)", jobDescription, source: 'Greenhouse' };
    }
    console.warn('[Tildra Job Copilot] Could not scrape all details from Greenhouse page. Found:', { jobTitle, companyName, jobDescriptionExists: !!jobDescription });
    return null;
}

async function scrapeLeverJob() {
    console.log('%c[Tildra] Running scrapeLeverJob...', 'color: #F0A; font-weight: bold;');
    await new Promise(resolve => setTimeout(resolve, 500));

    let jobTitle = null;
    let companyName = null;
    let jobDescription = null;

    // Lever often uses an iframe for the main content
    const iframe = document.querySelector('iframe[src*="lever.co"]');
    const doc = iframe ? iframe.contentDocument || iframe.contentWindow.document : document;

    if (iframe) {
        console.log('[Tildra] Lever iframe detected. Searching inside iframe.');
    } else {
        console.log('[Tildra] No Lever iframe detected. Searching main document.');
    }

    // Scrape from the correct document (main or iframe)
    const titleElement = doc.querySelector('.posting-headline h1, h1[data-qa="posting-name"]');
    jobTitle = titleElement ? titleElement.innerText.trim() : null;
    console.log(`[Tildra] Lever Title: ${jobTitle || 'Not Found'}`);

    // Company name might be outside the iframe in the main page title
    companyName = document.title.split(' - ')[1] || document.title.split(' at ')[1];
    
    const descriptionElement = doc.querySelector('section[data-qa="job-description"], .posting-body');
    jobDescription = descriptionElement ? descriptionElement.innerText.trim() : null;
    console.log(`[Tildra] Lever Description Length: ${jobDescription?.length || 0}`);

    if (jobTitle && jobDescription) {
        console.log('%c[Tildra] Scraped Lever successfully.', 'color: #00A36C;');
        return { jobTitle, companyName: companyName || "N/A", jobDescription, source: 'Lever' };
    }
    
    console.log('%c[Tildra] Lever scrape failed.', 'color: #FF6347;');
    return null;
}

async function scrapeAshbyHQJob() {
    console.log('[Tildra Job Copilot] Attempting to scrape AshbyHQ job page...');
    await new Promise(resolve => setTimeout(resolve, 500));

    const jobTitle = document.querySelector('h1[class*="_jobTitle_"]')?.textContent.trim();
    let companyName = document.querySelector('a[class*="_companyName_"]')?.textContent.trim();
    if (!companyName) {
      // Fallback: try to get from page title (e.g., "Job Title - Company Name | Ashby")
      const titleParts = document.title.split(' - ');
      if (titleParts.length > 1 && !titleParts[1].toLowerCase().includes('ashby')) {
        companyName = titleParts[1].split('|')[0].trim();
      }
    }
    const jobDescription = document.querySelector('div[class*="_description_"][data-ashby-js*="job-description"]')?.innerText.trim();

    if (jobTitle && companyName && jobDescription) {
        console.log('[Tildra Job Copilot] Successfully scraped AshbyHQ:', { jobTitle, companyName, jobDescriptionLength: jobDescription.length });
        return { jobTitle, companyName, jobDescription, source: 'AshbyHQ' };
    }
    console.warn('[Tildra Job Copilot] Could not scrape all details from AshbyHQ page. Found:', { jobTitle, companyName, jobDescriptionExists: !!jobDescription });
    return null;
}

// Placeholder for Glassdoor - primarily for company culture, JD scraping might be secondary or less common
async function scrapeGlassdoorJob() {
    console.log('[Tildra Job Copilot] Glassdoor detected. JD scraping may be limited, focus on company info later.');
    // For now, we might not actively scrape JD from Glassdoor unless it becomes a primary source.
    // If we do, selectors would be for job title and description if available.
    // Example: const jobTitle = document.querySelector('[data-test="job-title"]')?.textContent.trim();
    return null;
}

// Generic job scraper for unrecognized platforms
async function scrapeGenericJob() {
    console.log('[Tildra Job Copilot] Attempting generic job scraping...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay for generic pages

    // Try to find job title using common patterns
    let jobTitle = null;
    const titleSelectors = [
        'h1', 'h2', '.job-title', '#job-title', '[class*="job-title"]', '[id*="job-title"]',
        '.title', '.position-title', '.position', '.role', '.job-name',
        'h1[class*="title"]', 'h1[class*="position"]', 'h1[class*="job"]',
        '[data-automation="job-title"]', '[data-testid="job-title"]',
        '.posting-headline h1', '.job-header h1'
    ];
    
    for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.textContent?.trim();
            // Check if this looks like a job title (contains job-related keywords and isn't too long)
            if (text && text.length > 3 && text.length < 100 && 
                (text.toLowerCase().includes('engineer') || text.toLowerCase().includes('manager') || 
                 text.toLowerCase().includes('developer') || text.toLowerCase().includes('analyst') ||
                 text.toLowerCase().includes('specialist') || text.toLowerCase().includes('coordinator') ||
                 text.toLowerCase().includes('director') || text.toLowerCase().includes('lead') ||
                 text.toLowerCase().includes('senior') || text.toLowerCase().includes('junior') ||
                 text.toLowerCase().includes('assistant') || text.toLowerCase().includes('associate') ||
                 document.title.toLowerCase().includes(text.toLowerCase()))) {
                jobTitle = text;
                console.log(`[Tildra Job Copilot] Found job title using selector "${selector}": ${jobTitle}`);
                break;
            }
        }
    }

    // Try to find company name
    let companyName = null;
    const companySelectors = [
        '.company-name', '#company-name', '[class*="company"]', '[id*="company"]',
        '.employer', '.organization', '.company', '.business',
        '[data-automation="company-name"]', '[data-testid="company-name"]',
        '.company-info', '.employer-name'
    ];
    
    for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.textContent?.trim();
            if (text && text.length > 1 && text.length < 50 && !text.toLowerCase().includes('company')) {
                companyName = text;
                console.log(`[Tildra Job Copilot] Found company name using selector "${selector}": ${companyName}`);
                break;
            }
        }
    }

    // If no company found, try to extract from page title or URL
    if (!companyName) {
        const titleParts = document.title.split(' - ');
        if (titleParts.length > 1) {
            companyName = titleParts[titleParts.length - 1].trim();
            if (companyName.toLowerCase().includes('careers') || companyName.toLowerCase().includes('jobs')) {
                companyName = titleParts[titleParts.length - 2]?.trim() || companyName;
            }
        }
    }

    // Try to find job description
    let jobDescription = null;
    const descriptionSelectors = [
        '.job-description', '#job-description', '[class*="job-description"]', '[id*="job-description"]',
        '.description', '.content', '.job-content', '.posting-content',
        '.job-details', '.position-details', '.role-description',
        '[data-automation="job-description"]', '[data-testid="job-description"]',
        'main', '[role="main"]', '.main-content'
    ];
    
    for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.innerText?.trim();
            if (text && text.length > 100) { // Job descriptions should be substantial
                jobDescription = text;
                console.log(`[Tildra Job Copilot] Found job description using selector "${selector}" (length: ${text.length})`);
                break;
            }
        }
    }

    if (jobTitle && jobDescription) {
        console.log('[Tildra Job Copilot] Successfully scraped generic job:', { 
            jobTitle, 
            companyName: companyName || 'Unknown Company', 
            jobDescriptionLength: jobDescription.length 
        });
        return { 
            jobTitle, 
            companyName: companyName || 'Unknown Company', 
            jobDescription, 
            source: 'Generic' 
        };
    }
    
    console.warn('[Tildra Job Copilot] Could not scrape sufficient details from generic page. Found:', { 
        jobTitle, 
        companyName, 
        jobDescriptionExists: !!jobDescription 
    });
    return null;
}

// Taleo-specific scraper
async function scrapeTaleoJob() {
    console.log('[Tildra Job Copilot] Attempting to scrape Taleo job page...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Taleo pages can be slow to load

    // Taleo has specific patterns
    const jobTitle = document.querySelector('span.titlepage')?.textContent.trim() || 
                    document.querySelector('.contentheader')?.textContent.trim() ||
                    document.querySelector('h1')?.textContent.trim();
    
    let companyName = null;
    // Try to extract company name from URL or page elements
    const urlMatch = window.location.hostname.match(/^([^.]+)\.taleo\.net/);
    if (urlMatch) {
        companyName = urlMatch[1].charAt(0).toUpperCase() + urlMatch[1].slice(1);
    }
    
    // Try to find company name in page content
    if (!companyName) {
        const companyElement = document.querySelector('.company-name') || 
                              document.querySelector('[class*="company"]') ||
                              document.querySelector('title')?.textContent?.split(' - ')[1];
        if (companyElement) {
            companyName = companyElement.textContent?.trim() || companyElement;
        }
    }

    // Taleo job descriptions are often in specific containers
    let jobDescription = null;
    const descContainer = document.querySelector('.contentlinepanel') || 
                         document.querySelector('.requisitionDescriptionInterface') ||
                         document.querySelector('[class*="description"]') ||
                         document.querySelector('table[width="100%"]');
    
    if (descContainer) {
        jobDescription = descContainer.innerText?.trim();
    }

    if (jobTitle && jobDescription) {
        console.log('[Tildra Job Copilot] Successfully scraped Taleo job:', { 
            jobTitle, 
            companyName: companyName || 'Taleo Company', 
            jobDescriptionLength: jobDescription.length 
        });
        return { 
            jobTitle, 
            companyName: companyName || 'Taleo Company', 
            jobDescription, 
            source: 'Taleo' 
        };
    }
    
    console.warn('[Tildra Job Copilot] Could not scrape all details from Taleo page. Found:', { 
        jobTitle, 
        companyName, 
        jobDescriptionExists: !!jobDescription 
    });
    return null;
}

let jobDetailsScrapedOnLoad = false; // Flag to ensure initial scrape runs once

async function checkForAndScrapeJobDetails(forceScrape = false) {
    console.log(`%c[Tildra] Starting job details scrape. Force: ${forceScrape}, Already Run: ${jobDetailsScrapedOnLoad}`, 'color: #00A36C; font-weight: bold;');
    
    if (jobDetailsScrapedOnLoad && !forceScrape) {
        console.log('[Tildra] Skipping redundant scrape.');
        return;
    }

    jobDetailsScrapedOnLoad = true; // Set flag immediately to prevent re-runs from observer
    let details = null;
    const currentBoard = getCurrentJobBoard();
    console.log(`[Tildra] Detected Board: ${currentBoard || 'None'}`);

    // --- On-Page Scraping First ---
    if (currentBoard) {
        console.log(`[Tildra] Attempting specific scraper for: ${currentBoard}`);
        try {
            switch (currentBoard) {
                case 'LINKEDIN': details = await scrapeLinkedInJob(); break;
                case 'INDEED': details = await scrapeIndeedJob(); break;
                case 'GREENHOUSE': details = await scrapeGreenhouseJob(); break;
                case 'LEVER': details = await scrapeLeverJob(); break;
                case 'ASHBYHQ': details = await scrapeAshbyHQJob(); break;
                case 'TALEO': details = await scrapeTaleoJob(); break;
                case 'GLASSDOOR': details = await scrapeGlassdoorJob(); break;
            }
            console.log(`[Tildra] Specific scraper result:`, details);
        } catch (error) {
            console.error(`[Tildra] Error in specific scraper for ${currentBoard}:`, error);
        }
    }

    // Generic scraper as fallback if specific scraper fails or no board was detected
    if (!details) {
        console.log('[Tildra] Trying generic scraper...');
        try {
            details = await scrapeGenericJob();
            console.log(`[Tildra] Generic scraper result:`, details);
        } catch (error) {
            console.error('[Tildra] Error in generic scraper:', error);
        }
    }

    if (details) {
        console.log('%c[Tildra] On-page scrape successful. Sending initial data.', 'color: #00A36C;');
        // Send basic details immediately for fast UI response
        chrome.runtime.sendMessage({
            type: "JOB_PAGE_DETECTED",
            data: { ...details, pageUrl: window.location.href }
        });

        // Asynchronously send for API enhancement
        console.log('[Tildra] Sending scraped text for API enhancement...');
        chrome.runtime.sendMessage({
            type: "ENHANCE_JOB_DETAILS",
            data: {
                jobTitle: details.jobTitle,
                companyName: details.companyName,
                jobDescription: details.jobDescription,
                source: details.source,
                pageUrl: window.location.href
            }
        });
    } else {
        console.log('%c[Tildra] All on-page scraping attempts failed.', 'color: #FF6347;');
        chrome.runtime.sendMessage({ type: "JOB_PAGE_SCRAPE_FAILED" });
    }

    return details;
}

// This function is now deprecated in favor of the new flow.
// It will be removed or refactored later if needed.
// async function detectJobAndTailorResume() { ... }

// Message listener for manual job detection and content extraction
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'triggerJobDetection') {
        console.log('[Tildra Job Copilot] Manual job detection triggered');
        checkForAndScrapeJobDetails(true).then(result => {
            sendResponse({ success: !!result });
        }).catch(error => {
            console.error('[Tildra Job Copilot] Manual detection error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
    }
    
    // Simple content extraction for new popup
    if (message.action === 'getContent') {
        try {
            // Extract main content from the page
            let content = '';
            
            // Try multiple content selectors
            const contentSelectors = [
                'article',
                'main',
                '[role="main"]',
                '.content',
                '.post-content',
                '.article-content',
                '.job-description',
                '.description',
                '#content',
                'body'
            ];
            
            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    content = element.innerText.trim();
                    if (content.length > 200) break; // Good enough content found
                }
            }
            
            // Fallback: get all text content
            if (!content || content.length < 100) {
                content = document.body.innerText.trim();
            }
            
            // Clean up the content
            content = content
                .replace(/\s+/g, ' ') // Normalize whitespace
                .replace(/^\s*\n/gm, '') // Remove empty lines
                .substring(0, 50000); // Limit to 50k characters
            
            sendResponse({ 
                content: content,
                success: true 
            });
        } catch (error) {
            console.error('Content extraction error:', error);
            sendResponse({ 
                content: null, 
                success: false, 
                error: error.message 
            });
        }
        return true; // Keep message channel open
    }
    
    // Auth token extraction for Tildra website
    if (message.action === 'getAuthToken') {
        (async () => { // Wrap in an async IIFE to use await
            try {
                let authToken = null;
    
                const isJwt = (token) => token && typeof token === 'string' && token.split('.').length === 3;
    
                // Method 1: Try to get from window.__clerk (most reliable)
                if (window.__clerk && window.__clerk.session && typeof window.__clerk.session.getToken === 'function') {
                    try {
                        const token = await window.__clerk.session.getToken();
                        if (isJwt(token)) {
                            authToken = token;
                            console.log('[Tildra] Found auth token from window.__clerk.session.getToken()');
                        }
                    } catch (e) {
                        console.log('[Tildra] Error getting token from Clerk global object:', e.message);
                    }
                }
    
                // Method 2: Try to get from localStorage
                if (!authToken && window.localStorage) {
                    const clerkKeys = ['__clerk_session', '__clerk_token', 'clerk-session', 'clerk-token', 'auth-token', 'session-token'];
                    for (const key of clerkKeys) {
                        const value = localStorage.getItem(key);
                        if (value) {
                            try {
                                // Try parsing as JSON
                                const parsed = JSON.parse(value);
                                const token = parsed.token || parsed.sessionToken || parsed.jwt;
                                if (isJwt(token)) {
                                    authToken = token;
                                    console.log('[Tildra] Found auth token in parsed localStorage key:', key);
                                    break;
                                }
                            } catch (e) {
                                // If not JSON, check if the raw value is a JWT
                                if (isJwt(value)) {
                                    authToken = value;
                                    console.log('[Tildra] Found auth token string in localStorage key:', key);
                                    break;
                                }
                            }
                        }
                    }
                }
    
                // Method 3: Try to get from cookies
                if (!authToken && document.cookie) {
                    const cookies = document.cookie.split(';');
                    for (const cookie of cookies) {
                        const [name, value] = cookie.trim().split('=');
                        if (name && (name.startsWith('__clerk') || name.includes('session') || name.includes('auth') || name.includes('token'))) {
                            const decodedValue = decodeURIComponent(value);
                            if (isJwt(decodedValue)) {
                                authToken = decodedValue;
                                console.log('[Tildra] Found auth token in cookie:', name);
                                break;
                            }
                        }
                    }
                }
    
                sendResponse({
                    authToken: authToken,
                    success: !!authToken
                });
            } catch (error) {
                console.error('Auth token extraction error:', error);
                sendResponse({
                    authToken: null,
                    success: false,
                    error: error.message
                });
            }
        })();
        return true; // Keep message channel open for async response
    }
});

// --- Tildra Initialization ---
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

let hasRunInitialDetection = false;
// Debounce the check to avoid running it too frequently on busy SPAs
const debouncedJobCheck = debounce(() => checkForAndScrapeJobDetails(true), 1500);

function initializeTildraObserver() {
    console.log('%c[Tildra] Initializing Content Script Observer...', 'color: #00A36C; font-weight: bold;');

    // Run once on initial load after a short delay
    if (!hasRunInitialDetection) {
        hasRunInitialDetection = true;
        setTimeout(() => checkForAndScrapeJobDetails(false), 1000);
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // A more robust check for any added element that could be a job container
                const containsJobContent = Array.from(mutation.addedNodes).some(node =>
                    node.nodeType === Node.ELEMENT_NODE &&
                    (node.querySelector('[class*="job"], [class*="posting"]') ||
                     node.matches('[class*="job"], [class*="posting"]'))
                );

                if (containsJobContent) {
                    console.log('[Tildra] Observer detected significant DOM change. Triggering job check.');
                    debouncedJobCheck();
                    return; // No need to check other mutations
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('[Tildra] MutationObserver is now watching the page.');
}

// Start the initialization process
initializeTildraObserver();
