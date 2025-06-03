// This script runs in the context of the extension's popup.

// Wait for the DOM to be fully loaded before running script logic
document.addEventListener('DOMContentLoaded', () => {
  // --- Get references to NEW elements ---
  const openTabButton = document.querySelector('.open-tab-button');
  const summarizeTab = document.getElementById('summarize-tab');
  const historyTab = document.getElementById('history-tab');
  const summarizePanel = document.getElementById('panel-summarize');
  const historyPanel = document.getElementById('panel-history');
  const tabUnderline = document.querySelector('.tab-underline');
  const summarizeButton = document.getElementById('summarize-button');
  const upgradeLink = document.getElementById('upgrade-link'); // If needed
  const followupTab = document.getElementById('followup-tab');
  const followupPanel = document.getElementById('panel-followup');
  // --- New Sections tab ---
  const sectionsTab = document.getElementById('sections-tab');
  const sectionsPanel = document.getElementById('panel-sections');
  // Settings controls
  const themeSelect = document.getElementById('theme-select');
  const accentColorPicker = document.getElementById('accent-color-picker');
  const disableOverlayToggle = document.getElementById('disable-overlay-toggle');
  const exportHistoryButton = document.getElementById('export-history-button');
  const popupBgPicker = document.getElementById('popup-bg-picker');
  const popupTextPicker = document.getElementById('popup-text-picker');
  const overlayBgPicker = document.getElementById('overlay-bg-picker');
  const overlayTextPicker = document.getElementById('overlay-text-picker');
  const enableHighlightingToggle = document.getElementById('enable-highlighting-toggle');

  // --- NEW Job Copilot UI Elements ---
  const jobCopilotDisplayArea = document.getElementById('job-copilot-display-area');
  const jobCopilotStatus = document.getElementById('job-copilot-status');
  const jobCopilotDetailsDiv = document.getElementById('job-copilot-details');
  const jobTitleDisplay = document.getElementById('job-title-display');
  const jobCompanyDisplay = document.getElementById('job-company-display');
  const jobSourceDisplay = document.getElementById('job-source-display');
  const jobDescriptionSnippet = document.getElementById('job-description-snippet');
  // --- END NEW Job Copilot UI Elements ---

  // --- New summary enhancement elements ---
  const summaryLengthSelect = document.getElementById('summary-length');
  const loadingProgress = document.getElementById('loading-progress');
  const progressBar = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  const progressSubtext = document.querySelector('.progress-subtext');
  const readingTime = document.getElementById('reading-time');
  const summaryLengthBadge = document.getElementById('summary-length-badge');

  // --- Existing/Modified element references ---
  const loadingSpinner = document.getElementById('loading'); // Keep for potential future use, though hidden by CSS
  const summaryContainer = document.getElementById('summary-container');
  const tldrSection = document.getElementById('tldr');
  const keyPointsList = document.getElementById('key-points');
  const errorDiv = document.getElementById('error');
  const copyButton = document.getElementById('copy-button');
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  const clearHistoryButton = document.getElementById('clear-history-button');

  // Configuration will be fetched from background script
  let BG_CONFIG = {
    apiUrlBase: 'https://tildra.fly.dev', // Default to Production
    cookieDomainUrl: 'https://www.tildra.xyz', // Default to Production
    isDevMode: false
  };

  // const BACKEND_URL = 'http://127.0.0.1:8000/summarize'; // LOCAL DEV - REMOVED
  // const COOKIE_DOMAIN_URL = 'http://localhost:3000'; // LOCAL DEV - REMOVED
  const COOKIE_NAME = '__session'; // Clerk's session cookie name

  // --- Start Edit: Add checks for element existence ---
  if (!summarizeButton) {
      console.error("Error: Could not find element with ID 'summarize-button'");
      return; // Stop execution if button isn't found
  }
  if (!copyButton) {
      console.error("Error: Could not find element with ID 'copy-button'");
      // Decide if this is critical - maybe copy functionality isn't essential?
      // return;
  }
  // Remove loadingSpinner from the check as it's no longer used
  if (!summaryContainer || !tldrSection || !keyPointsList || !errorDiv || !historyList || !historyEmpty || !clearHistoryButton) {
      console.error("Error: One or more required UI elements not found in the new structure.");
      // Display error in the UI
      if(errorDiv) {
          errorDiv.textContent = "Initialization Error. Please report this.";
          errorDiv.style.display = 'block';
      }
      return; // Stop execution if essential elements are missing
  }
  // --- End Edit ---

  // Smart loading progress management
  function showSmartLoading(show = true) {
    if (show) {
      loadingProgress.style.display = 'block';
      summarizeButton.setAttribute('aria-busy', 'true');
      summarizeButton.querySelector('.button-icon').style.display = 'inline-block';
      
      // Start progress sequence
      setTimeout(() => updateProgress('analyzing'), 100);
      setTimeout(() => updateProgress('processing'), 2000);
      setTimeout(() => updateProgress('generating'), 4000);
    } else {
      loadingProgress.style.display = 'none';
      summarizeButton.setAttribute('aria-busy', 'false');
      summarizeButton.querySelector('.button-icon').style.display = 'none';
      resetProgress();
    }
  }

  function updateProgress(phase) {
    const phases = {
      analyzing: {
        text: 'Analyzing content...',
        subtext: 'Reading and understanding the article',
        class: 'progress-analyzing'
      },
      processing: {
        text: 'Processing information...',
        subtext: 'Extracting key insights and themes',
        class: 'progress-processing'
      },
      generating: {
        text: 'Generating summary...',
        subtext: 'Creating your personalized summary',
        class: 'progress-generating'
      },
      complete: {
        text: 'Complete!',
        subtext: 'Summary ready',
        class: 'progress-complete'
      }
    };

    const phaseData = phases[phase];
    if (phaseData) {
      progressText.textContent = phaseData.text;
      progressSubtext.textContent = phaseData.subtext;
      
      // Remove all phase classes
      loadingProgress.className = 'loading-progress';
      // Add current phase class
      loadingProgress.classList.add(phaseData.class);
    }
  }

  function resetProgress() {
    loadingProgress.className = 'loading-progress';
    progressText.textContent = 'Analyzing content...';
    progressSubtext.textContent = 'This may take a few moments';
  }

  // Calculate reading time estimate
  function calculateReadingTime(text, keyPoints = []) {
    const wordsPerMinute = 200; // Average reading speed
    const tldrWords = text.split(' ').length;
    const keyPointsWords = keyPoints.reduce((total, point) => total + point.split(' ').length, 0);
    const totalWords = tldrWords + keyPointsWords;
    const minutes = Math.ceil(totalWords / wordsPerMinute);
    return Math.max(1, minutes); // Minimum 1 minute
  }

  // Function to show loading state (kept for reference, but not used directly for button)
  function showLoading(isLoading) {
    // loadingSpinner.style.display = isLoading ? 'block' : 'none';
  }

  // Function to display summary with enhanced features
  function displaySummary(summaryData) {
    // Show completion progress briefly
    updateProgress('complete');
    setTimeout(() => showSmartLoading(false), 1000);
    
    summaryContainer.style.display = 'block';
    copyButton.style.display = 'inline-block';
    
    // Update TL;DR
    tldrSection.textContent = summaryData.tldr;
    
    // Calculate and display reading time
    const estimatedTime = calculateReadingTime(summaryData.tldr, summaryData.key_points);
    readingTime.textContent = `📖 ~${estimatedTime} min read`;
    
    // Update summary length badge
    const selectedLength = summaryLengthSelect.value;
    const lengthLabels = {
      brief: 'Brief',
      standard: 'Standard', 
      detailed: 'Detailed'
    };
    summaryLengthBadge.textContent = lengthLabels[selectedLength] || 'Standard';
    
    // Clear and populate key points
    keyPointsList.innerHTML = '';
    
    summaryData.key_points.forEach((point, index) => {
      const li = document.createElement('li');
      
      const pointText = document.createElement('span');
      pointText.className = 'key-point-text';
      pointText.textContent = point;
      
      li.appendChild(pointText);
      keyPointsList.appendChild(li);
    });
    
    // Check if this is the user's first summary and show a welcome tip
    chrome.storage.local.get(['summaryHistory', 'hasSeenFirstSummary'], (result) => {
      const history = result.summaryHistory || [];
      const hasSeenFirstSummary = result.hasSeenFirstSummary || false;
      
      if (history.length === 0 && !hasSeenFirstSummary) {
        showFirstSummaryTip();
        chrome.storage.local.set({ hasSeenFirstSummary: true });
      }
    });
  }

  function showFirstSummaryTip() {
    // Create a small tooltip near the copy button
    const tooltip = document.createElement('div');
    tooltip.className = 'first-summary-tip';
    tooltip.innerHTML = `
      <div class="tip-content">
        🎉 Great! Your first summary is ready. 
        <br>Try the <strong>History</strong> tab to see all your summaries!
      </div>
    `;
    
    // Position it near the summary container
    summaryContainer.appendChild(tooltip);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    }, 5000);
    
    // Allow manual dismissal
    tooltip.addEventListener('click', () => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    });
  }

  // Function to display errors
  function displayError(message) {
    showSmartLoading(false);
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    if(summaryContainer) summaryContainer.style.display = 'none';
    if(copyButton) copyButton.style.display = 'none';
  }

  // Function to clear previous state
  function clearState() {
    if(summaryContainer) summaryContainer.style.display = 'none';
    if(errorDiv) errorDiv.style.display = 'none';
    if(copyButton) {
         copyButton.disabled = false;
         copyButton.style.display = 'none';
    }
    if(tldrSection) tldrSection.textContent = '';
    if(keyPointsList) keyPointsList.innerHTML = '';
    showSmartLoading(false);
  }

  // --- Start Edit: Add function to get Clerk session cookie ---
  async function getClerkSessionToken() {
    return new Promise((resolve, reject) => {
      if (!chrome || !chrome.cookies) {
        return reject(new Error("Chrome cookies API is not available."));
      }
      // Use cookie domain from background config
      chrome.cookies.get({ url: BG_CONFIG.cookieDomainUrl, name: COOKIE_NAME }, (cookie) => {
        if (chrome.runtime.lastError) {
          // Handle errors, e.g., permissions missing or cookie not found
          console.error('Error getting cookie:', chrome.runtime.lastError.message);
          return reject(new Error(`Could not get session cookie: ${chrome.runtime.lastError.message}`));
        }
        if (cookie) {
          console.log('Clerk session token found.');
          resolve(cookie.value);
        } else {
          console.warn('Clerk session token not found. User might not be logged in.');
          // Resolve with null or empty string to indicate no token
          resolve(null);
        }
      });
    });
  }
  // --- End Edit ---

  // --- ADD: Function to get user subscription status ---
  async function getUserStatus() {
    console.log('[Tildra Popup] Checking user status...');
    try {
      const token = await getClerkSessionToken();
      if (!token) return false;
      // Use API URL from background config
      const res = await fetch(`${BG_CONFIG.apiUrlBase}/api/user/status`, { 
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.is_pro;
    } catch (error) {
      console.error('Error fetching user status:', error);
      return false;
    }
  }
  // --- END ADD ---

  // --- Setup --- 
  const footerUpsell = document.querySelector('.footer'); // Get footer element

  // Tab Switching Logic
  function switchTab(targetTab) {
    const isSummarize = targetTab === summarizeTab;
    const isHistory = targetTab === historyTab;
    const isFollowup = targetTab === followupTab;

    // Handle tab states (only for actual tabs, not settings)
    summarizeTab.classList.toggle('active', isSummarize);
    historyTab.classList.toggle('active', isHistory);
    followupTab.classList.toggle('active', isFollowup);
    summarizeTab.setAttribute('aria-selected', String(isSummarize));
    historyTab.setAttribute('aria-selected', String(isHistory));
    followupTab.setAttribute('aria-selected', String(isFollowup));

    // Handle panel visibility
    summarizePanel.hidden = !isSummarize;
    historyPanel.hidden = !isHistory;
    followupPanel.hidden = !isFollowup;
    sectionsPanel.hidden = true; // Settings panel is hidden when switching to tabs

    // Remove settings button active state when switching to tabs
    sectionsTab.classList.remove('active');
    sectionsTab.setAttribute('aria-selected', 'false');

    // Move underline for three tabs
    if (tabUnderline) {
      if (isSummarize) tabUnderline.style.transform = 'translateX(0%)';
      else if (isHistory) tabUnderline.style.transform = 'translateX(100%)';
      else if (isFollowup) tabUnderline.style.transform = 'translateX(200%)';
      tabUnderline.style.width = '33.33%';
    }

    if (isHistory) {
      loadHistorySummaries();
    }
  }

  // Settings button toggle function
  function toggleSettings() {
    const isSettingsOpen = sectionsPanel.hidden === false;
    
    if (isSettingsOpen) {
      // Close settings - return to last active tab
      const lastActiveTab = document.querySelector('.tab.active') || summarizeTab;
      switchTab(lastActiveTab);
    } else {
      // Open settings - hide all tab panels and show settings
      summarizePanel.hidden = true;
      historyPanel.hidden = true;
      followupPanel.hidden = true;
      sectionsPanel.hidden = false;

      // Remove active state from all tabs
      summarizeTab.classList.remove('active');
      historyTab.classList.remove('active');
      followupTab.classList.remove('active');
      summarizeTab.setAttribute('aria-selected', 'false');
      historyTab.setAttribute('aria-selected', 'false');
      followupTab.setAttribute('aria-selected', 'false');

      // Activate settings button
      sectionsTab.classList.add('active');
      sectionsTab.setAttribute('aria-selected', 'true');
    }
  }

  if (summarizeTab && historyTab && followupTab && sectionsTab) {
    summarizeTab.addEventListener('click', () => switchTab(summarizeTab));
    historyTab.addEventListener('click', () => switchTab(historyTab));
    followupTab.addEventListener('click', () => switchTab(followupTab));
    sectionsTab.addEventListener('click', () => toggleSettings());
  }

  // Add this function near the top of the file after other helper functions
  function isProtectedPage(url) {
    if (!url) return true;
    const protectedSchemes = [
      'chrome://',
      'chrome-extension://',
      'chrome-search://',
      'chrome-devtools://',
      'moz-extension://',
      'about:',
      'edge://',
      'opera://',
      'brave://',
      'file:///'
    ];
    return protectedSchemes.some(scheme => url.startsWith(scheme));
  }

  // Summarize button click handler
  summarizeButton.addEventListener('click', () => {
    console.log('Summarize button clicked');
    clearState();
    showSmartLoading(true);
    updateProgress('analyzing');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab || !currentTab.id) {
        displayError("Could not get current tab info.");
        return;
      }

      // Check if this is a protected page
      if (isProtectedPage(currentTab.url)) {
        displayError("Cannot summarize this page. Please navigate to a regular webpage (news article, blog post, etc.) and try again.");
        return;
      }

      // Inject Readability.js first
      chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ["readability.js"] }, () => {
        if (chrome.runtime.lastError) {
          console.error("Inject Readability Error:", chrome.runtime.lastError.message);
          let errorMsg = chrome.runtime.lastError.message;
          
          // Provide user-friendly error messages
          if (errorMsg.includes("Cannot access a chrome:// URL") || errorMsg.includes("chrome://")) {
            errorMsg = "Cannot summarize Chrome internal pages. Please try a regular webpage.";
          } else if (errorMsg.includes("Cannot access contents") || errorMsg.includes("blocked by the page")) {
            errorMsg = "This page blocks extensions. Please try a different webpage.";
          } else if (errorMsg.includes("chrome-extension://")) {
            errorMsg = "Cannot summarize extension pages. Please navigate to a regular webpage.";
          }
          
          displayError(errorMsg);
          return;
        }

        // Inject function to get content
        chrome.scripting.executeScript({ target: { tabId: currentTab.id }, function: getArticleContent }, async (injectionResults) => {
          if (chrome.runtime.lastError || !injectionResults || !injectionResults[0]) {
            let msg = chrome.runtime.lastError ? chrome.runtime.lastError.message : "Content script error.";
            if (msg.includes("Cannot access a chrome:// URL")) msg = "Cannot summarize Chrome pages.";
            else if (msg.includes("Cannot access contents")) msg = "Cannot access this page.";
            console.error("Injection Error:", msg);
            displayError(msg);
            return;
          }

          const result = injectionResults[0].result;
          if (result.error) {
            console.error("Content Extraction Error:", result.error);
            displayError(result.error);
            return;
          }

          const articleText = result.content;
          if (!articleText || articleText.trim().length < 50) {
            displayError("Not enough content found to summarize.");
            return;
          }

          let sessionToken = null;
          try {
            sessionToken = await getClerkSessionToken();
            if (!sessionToken) {
              displayError("Please log in to tildra.xyz first.");
              return;
            }
          } catch (error) {
            displayError(`Auth Error: ${error.message}`);
            return;
          }

          // Get selected summary length
          const summaryLength = summaryLengthSelect.value || 'standard';

          // Use background script for the API call
          chrome.runtime.sendMessage(
            { 
              action: 'summarizeAPI', 
              textContent: articleText, 
              token: sessionToken,
              url: currentTab.url, 
              title: currentTab.title || 'Untitled Page',
              summaryLength: summaryLength // Pass the summary length preference
            }, 
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("BG message error:", chrome.runtime.lastError.message);
                displayError(`Communication error: ${chrome.runtime.lastError.message}`);
              } else if (response && response.success) {
                displaySummary(response.summaryData);
              } else if (response && response.expired) {
                displayError("Session expired. Please log back in to tildra.xyz.");
              } else if (response && response.isUsageLimit) {
                displayError(response.error || "You've reached your summary limit.");
                const upgradeCTA = document.getElementById('upgrade-link');
                if (upgradeCTA) {
                    // Only show upgrade CTA for free users, not premium users
                    if (response.isPremiumUser) {
                        upgradeCTA.style.display = 'none';
                        // Add a note about contacting support for premium users
                        const supportNote = document.createElement('div');
                        supportNote.className = 'support-note';
                        supportNote.innerHTML = `
                          <div style="text-align: center; margin-top: 10px; padding: 8px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; font-size: 12px;">
                            <strong>Need more summaries?</strong><br>
                            <a href="mailto:support@tildra.xyz?subject=Additional Summaries Request" style="color: #0ea5e9; text-decoration: none;">Contact Support</a> for custom options
                          </div>
                        `;
                        // Insert after error div
                        const errorDiv = document.getElementById('error');
                        if (errorDiv && errorDiv.parentNode) {
                          errorDiv.parentNode.insertBefore(supportNote, errorDiv.nextSibling);
                        }
                    } else {
                        upgradeCTA.style.display = 'block';
                    }
                }
              } else {
                displayError(`API Error: ${response?.error || 'Unknown error'}`);
              }
            }
          );
        }); // End function injection callback
      }); // End file injection callback
    }); // End tabs.query callback
  }); // End summarizeButton click listener

  // Copy button functionality
  copyButton.addEventListener('click', () => {
    const summary = tldrSection.textContent;
    const points = Array.from(keyPointsList.querySelectorAll('li')).map(li => `• ${li.textContent}`).join('\n');
    const textToCopy = `TL;DR:\n${summary}\n\nKey Points:\n${points}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      // --- Visual Feedback ---
      const originalIcon = copyButton.innerHTML; // Store original SVG
      // Replace with a checkmark icon (example SVG)
      copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      copyButton.disabled = true; // Briefly disable

      // Revert after a short delay
      setTimeout(() => {
        copyButton.innerHTML = originalIcon;
        copyButton.disabled = false;
      }, 1500); // 1.5 seconds
      // -----------------------

    }).catch(err => {
      console.error('Failed to copy text: ', err);
      // Optional: Show a brief error state on the button or near it
    });
  });

  // This function will be injected into the active tab
  function getArticleContent() {
    // Check if Readability is loaded *within the target page context*
    if (typeof Readability === 'undefined') {
      console.error("SnipSummary (injected): Readability library not available in this page context.");
      return { error: "Readability library could not be loaded/injected.", content: null };
    }

    try {
      const documentClone = document.cloneNode(true);
      const reader = new Readability(documentClone, {
          // debug: true // Optional: Enable for debugging Readability itself
      });
      const article = reader.parse();

      if (article && article.textContent) {
        return { error: null, content: article.textContent };
      } else {
        console.warn("SnipSummary (injected): Readability could not parse article content.");
        const mainElement = document.querySelector('main');
        let fallbackContent = document.body ? document.body.innerText : '';
        if (mainElement && mainElement.innerText) {
          fallbackContent = mainElement.innerText;
        }
        return { error: "Readability could not parse effectively.", content: fallbackContent };
      }
    } catch (e) {
      console.error("SnipSummary (injected): Error during Readability parsing:", e);
      let fallbackContent = document.body ? document.body.innerText : '';
      const mainElement = document.querySelector('main');
      if (mainElement && mainElement.innerText) {
        fallbackContent = mainElement.innerText;
      }
      return { error: `Readability parsing failed: ${e.message}`, content: fallbackContent };
    }
  }

  // Format date for history items
  function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      // Use 'm' suffix for minutes
      return `${diffMins}m ago`; 
    } else if (diffHours < 24) {
       // Use 'h' suffix for hours
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      // Use 'd' suffix for days
      return `${diffDays}d ago`;
    } else {
      // Format as short date MM/DD/YYYY
      return date.toLocaleDateString(); 
    }
  }

  // Load summaries from storage
  function loadHistorySummaries() {
    chrome.storage.local.get(['summaryHistory'], (result) => {
      const history = result.summaryHistory || [];
      
      historyList.innerHTML = ''; // Clear previous items
      if (history.length === 0) {
        historyEmpty.style.display = 'block';
        if(clearHistoryButton) clearHistoryButton.style.display = 'none'; // Hide clear button if no history
      } else {
        historyEmpty.style.display = 'none';
        if(clearHistoryButton) clearHistoryButton.style.display = 'inline-block'; // Show clear button
        history.forEach(item => {
          const historyItem = document.createElement('li');
          historyItem.className = 'history-item';
          historyItem.dataset.id = item.id;
          
          // Build the item HTML with a delete button
          historyItem.innerHTML = `
            <div class="history-item-content">
              <div class="history-item-title">${item.title}</div>
              <div class="history-item-summary">${item.summary}</div>
              <div class="history-item-time">${formatDate(item.timestamp)}</div>
            </div>
            <button class="history-item-delete" data-id="${item.id}" title="Delete this summary">&times;</button>
          `;
          
          // Get references to the content and delete button *after* setting innerHTML
          const itemContent = historyItem.querySelector('.history-item-content');
          const deleteButton = historyItem.querySelector('.history-item-delete');

          // Show details when clicking the main content area
          if (itemContent) {
              itemContent.addEventListener('click', () => {
                // Display the summary in the summary tab
                displaySummary({ tldr: item.summary, key_points: item.keyPoints });
                switchTab(summarizeTab); // Switch view to summarize tab
              });
          }
          
          // Handle deletion when clicking the delete button
          if (deleteButton) {
              deleteButton.addEventListener('click', (event) => {
                  event.stopPropagation(); // Prevent click from bubbling up to the itemContent listener
                  const historyIdToDelete = event.target.dataset.id;
                  
                  if (confirm('Delete this summary?')) {
                      // Retrieve current history
                      chrome.storage.local.get(['summaryHistory'], (result) => {
                          let currentHistory = result.summaryHistory || [];
                          // Filter out the item to delete
                          const updatedHistory = currentHistory.filter(histItem => histItem.id !== historyIdToDelete);
                          
                          // Save the updated history
                          chrome.storage.local.set({ 'summaryHistory': updatedHistory }, () => {
                              if (chrome.runtime.lastError) {
                                  console.error('Error deleting history item:', chrome.runtime.lastError);
                              } else {
                                  console.log('History item deleted:', historyIdToDelete);
                                  // Refresh the list visually
                                  loadHistorySummaries(); 
                              }
                          });
                      });
                  }
              });
          }
          
          historyList.appendChild(historyItem);
        });
      }
    });
  }

  // --- Add Event Listener for Clear History Button ---
  if (clearHistoryButton) {
    clearHistoryButton.addEventListener('click', () => {
      // Ask for confirmation
      if (confirm('Clear all summary history? This cannot be undone.')) {
        // Clear the history in storage
        chrome.storage.local.set({ 'summaryHistory': [] }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error clearing history:', chrome.runtime.lastError);
            // Optionally display an error to the user in the UI
          } else {
            console.log('Summary history cleared.');
            // Refresh the displayed history list
            loadHistorySummaries();
          }
        });
      }
    });
  } else {
      console.error("Could not find clear history button element");
  }
  // --- End Event Listener ---

  // --- Initial Load --- 
  // Check user status and update UI accordingly
  async function initializePopup() {
    // Fetch and apply settings first
    loadSettings();

    // Fetch config from background script
    chrome.runtime.sendMessage({ action: "getBgConfig" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("[Tildra Popup] Error getting BG config:", chrome.runtime.lastError.message);
            // Proceed with default BG_CONFIG
        } else if (response && response.config) {
            BG_CONFIG = response.config;
            console.log("[Tildra Popup] Received BG_CONFIG:", BG_CONFIG);
        }
        // After config is potentially updated, update UI that might depend on it (e.g. pro status)
        updateProStatusUI(); 
    });
    
    // --- NEW: Fetch Job Details for current tab ---
    if (jobCopilotDisplayArea) jobCopilotDisplayArea.style.display = 'block'; // Show status initially
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            const currentTabId = tabs[0].id;
            console.log(`[Tildra Popup] Querying job details for current tab ID: ${currentTabId}`);
            chrome.runtime.sendMessage(
                { action: "GET_CURRENT_TAB_JOB_DETAILS", tabId: currentTabId },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("[Tildra Popup] Error getting job details:", chrome.runtime.lastError.message);
                        showJobDetectionStatus('Error fetching job details.');
                        return;
                    }
                    if (response) {
                        console.log("[Tildra Popup] Response from GET_CURRENT_TAB_JOB_DETAILS:", response);
                        if (response.status === "SUCCESS" && response.data) {
                            displayJobDetails(response.data);
                        } else if (response.status === "NOT_FOUND") {
                            showJobDetectionStatus('No job details detected on this page.');
                        } else {
                            showJobDetectionStatus('Could not retrieve job details at this time.');
                        }
                    } else {
                        console.warn("[Tildra Popup] No response received for GET_CURRENT_TAB_JOB_DETAILS.");
                        showJobDetectionStatus('No response from background script for job details.');
                    }
                }
            );
        } else {
            console.warn("[Tildra Popup] Could not get active tab ID to fetch job details.");
            if (jobCopilotDisplayArea) showJobDetectionStatus('Cannot determine current tab.');
        }
    });
    // --- END NEW Fetch Job Details ---

    // Load history and update pro status
    loadHistorySummaries();
    // updateProStatusUI(); // Called after BG_CONFIG is fetched
    checkAndShowOnboarding();

    if (summarizeButton) {
      summarizeButton.onclick = () => {
        // ... (rest of existing initializePopup and other functions: saveSettings, loadSettings, applyTheme, etc.) ...
      };
    }
  }

  // Onboarding functionality
  function checkAndShowOnboarding() {
    chrome.storage.local.get(['hasSeenOnboarding'], (result) => {
      if (!result.hasSeenOnboarding) {
        showOnboarding();
      }
    });
  }

  function showOnboardingStep(stepNumber) {
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
      const step = document.getElementById(`onboarding-step-${i}`);
      if (step) {
        step.style.display = 'none';
      }
    }
    
    // Show current step
    const currentStep = document.getElementById(`onboarding-step-${stepNumber}`);
    if (currentStep) {
      currentStep.style.display = 'block';
    }
  }

  function showOnboarding() {
    const onboardingPanel = document.getElementById('panel-onboarding');
    
    if (onboardingPanel) {
      // Hide all other panels
      document.querySelectorAll('.panel').forEach(panel => {
        panel.hidden = true;
      });
      
      // Show onboarding panel
      onboardingPanel.hidden = false;
      onboardingPanel.classList.add('active');
      
      // Show first step
      showOnboardingStep(1);
      
      // Hide main interface elements by adding class to body
      document.body.classList.add('onboarding-mode');
      
      // Deactivate all tabs
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });
    }
  }

  function hideOnboarding() {
    const onboardingPanel = document.getElementById('panel-onboarding');
    
    if (onboardingPanel) {
      onboardingPanel.hidden = true;
      onboardingPanel.classList.remove('active');
      
      // Show main interface elements again
      document.body.classList.remove('onboarding-mode');
    }
    
    // Mark onboarding as completed
    chrome.storage.local.set({ hasSeenOnboarding: true }, () => {
      console.log("[Tildra Popup] Onboarding completed and marked as seen");
      
      // Switch to the summarize tab
      switchTab(summarizeTab);
      
      // Now initialize the main interface for the first time
      updateProStatusUI();
      
      // Add a subtle highlight to guide user to the main button
      setTimeout(() => {
        highlightSummarizeButton();
      }, 300);
    });
  }

  // Onboarding event listeners
  const onboardingNext1 = document.getElementById('onboarding-next-1');
  const onboardingNext2 = document.getElementById('onboarding-next-2');
  const onboardingBack2 = document.getElementById('onboarding-back-2');
  const onboardingBack3 = document.getElementById('onboarding-back-3');
  const onboardingFinish = document.getElementById('onboarding-finish');
  const showTutorialButton = document.getElementById('show-tutorial-button');

  if (onboardingNext1) {
    onboardingNext1.addEventListener('click', () => showOnboardingStep(2));
  }

  if (onboardingNext2) {
    onboardingNext2.addEventListener('click', () => showOnboardingStep(3));
  }

  if (onboardingBack2) {
    onboardingBack2.addEventListener('click', () => showOnboardingStep(1));
  }

  if (onboardingBack3) {
    onboardingBack3.addEventListener('click', () => showOnboardingStep(2));
  }

  if (onboardingFinish) {
    onboardingFinish.addEventListener('click', () => {
      hideOnboarding();
    });
  }

  // Show Tutorial Button (for settings)
  if (showTutorialButton) {
    showTutorialButton.addEventListener('click', () => {
      showOnboarding();
    });
  }

  function highlightSummarizeButton() {
    const summarizeButton = document.getElementById('summarize-button');
    if (summarizeButton) {
      // Add a gentle pulsing animation to draw attention
      summarizeButton.classList.add('welcome-highlight');
      
      // Remove the highlight after a few seconds
      setTimeout(() => {
        if (summarizeButton) {
          summarizeButton.classList.remove('welcome-highlight');
        }
      }, 4000);
    }
  }

  async function updateProStatusUI() { // Original initializePopup logic, now uses BG_CONFIG
    const isProUser = await getUserStatus(); // getUserStatus will now use BG_CONFIG.apiUrlBase
    console.log('[Tildra Popup] User is Pro:', isProUser);

    if (isProUser && footerUpsell) {
      footerUpsell.style.display = 'none'; // Hide footer for pro users
    } else if (footerUpsell) {
      footerUpsell.style.display = 'block'; // Ensure footer is visible for free users
    }
    // Hide the upgrade link in the popup for pro users
    if (upgradeLink) {
      upgradeLink.style.display = isProUser ? 'none' : 'block';
    }
    
    // Optionally add a message for pro users somewhere else?
    // For now, just hiding the upsell is the main requirement.
  }

  // Header button to open website
  if (openTabButton) {
    openTabButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.tildra.xyz' }); // Point to actual site
    });
  }

  // --- Settings: Theme, Accent Color, Overlay ---
  function saveSettings(settings) {
    console.log('[Tildra Popup] Saving settings:', settings);
    chrome.storage.local.set({ tildraSettings: settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Tildra Popup] Error saving settings:', chrome.runtime.lastError.message);
      }
    });
  }
  function loadSettings() {
    chrome.storage.local.get(['tildraSettings'], (result) => {
      const settings = result.tildraSettings || {};
      console.log('[Tildra Popup] Loaded settings:', settings);
      if (themeSelect && settings.theme) themeSelect.value = settings.theme;
      if (accentColorPicker && settings.accentColor) accentColorPicker.value = settings.accentColor;
      if (disableOverlayToggle) disableOverlayToggle.checked = !!settings.disableOverlay;
      if (popupBgPicker && settings.popupBg) popupBgPicker.value = settings.popupBg;
      if (popupTextPicker && settings.popupText) popupTextPicker.value = settings.popupText;
      if (overlayBgPicker && settings.overlayBg) overlayBgPicker.value = settings.overlayBg;
      if (overlayTextPicker && settings.overlayText) overlayTextPicker.value = settings.overlayText;
      if (enableHighlightingToggle) enableHighlightingToggle.checked = settings.enableHighlighting !== false;
      applyTheme(settings.theme, settings.accentColor, settings.popupBg, settings.popupText, settings.overlayBg, settings.overlayText);
    });
  }
  function applyTheme(theme, accentColor, popupBg, popupText, overlayBg, overlayText) {
    console.log('[Tildra Popup] Applying theme:', { theme, accentColor, popupBg, popupText, overlayBg, overlayText });
    const root = document.documentElement;
    if (accentColor) {
      root.style.setProperty('--accent-primary', accentColor);
      root.style.setProperty('--accent-solid', accentColor);
    }
    if (popupBg) root.style.setProperty('--popup-bg', popupBg);
    if (popupText) root.style.setProperty('--popup-text', popupText);
    if (overlayBg) root.style.setProperty('--overlay-bg', overlayBg);
    if (overlayText) root.style.setProperty('--overlay-text', overlayText);
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('dark');
      root.classList.remove('light');
    }
  }
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      chrome.storage.local.get(['tildraSettings'], (result) => {
        const settings = result.tildraSettings || {};
        settings.theme = themeSelect.value;
        saveSettings(settings);
        applyTheme(settings.theme, settings.accentColor, settings.popupBg, settings.popupText, settings.overlayBg, settings.overlayText);
      });
    });
  }
  if (accentColorPicker) {
    accentColorPicker.addEventListener('input', () => {
      chrome.storage.local.get(['tildraSettings'], (result) => {
        const settings = result.tildraSettings || {};
        settings.accentColor = accentColorPicker.value;
        saveSettings(settings);
        applyTheme(settings.theme, settings.accentColor, settings.popupBg, settings.popupText, settings.overlayBg, settings.overlayText);
      });
    });
  }
  if (disableOverlayToggle) {
    disableOverlayToggle.addEventListener('change', () => {
      chrome.storage.local.get(['tildraSettings'], (result) => {
        const settings = result.tildraSettings || {};
        settings.disableOverlay = disableOverlayToggle.checked;
        console.log('[Tildra Popup] disableOverlayToggle changed to:', settings.disableOverlay);
        saveSettings(settings);
      });
    });
  }
  if (popupBgPicker) {
    popupBgPicker.addEventListener('input', () => {
      chrome.storage.local.get(['tildraSettings'], (result) => {
        const settings = result.tildraSettings || {};
        settings.popupBg = popupBgPicker.value;
        saveSettings(settings);
        applyTheme(settings.theme, settings.accentColor, settings.popupBg, settings.popupText, settings.overlayBg, settings.overlayText);
      });
    });
  }
  if (popupTextPicker) {
    popupTextPicker.addEventListener('input', () => {
      chrome.storage.local.get(['tildraSettings'], (result) => {
        const settings = result.tildraSettings || {};
        settings.popupText = popupTextPicker.value;
        saveSettings(settings);
        applyTheme(settings.theme, settings.accentColor, settings.popupBg, settings.popupText, settings.overlayBg, settings.overlayText);
      });
    });
  }
  if (overlayBgPicker) {
    overlayBgPicker.addEventListener('input', () => {
      chrome.storage.local.get(['tildraSettings'], (result) => {
        const settings = result.tildraSettings || {};
        settings.overlayBg = overlayBgPicker.value;
        saveSettings(settings);
        applyTheme(settings.theme, settings.accentColor, settings.popupBg, settings.popupText, settings.overlayBg, settings.overlayText);
      });
    });
  }
  if (overlayTextPicker) {
    overlayTextPicker.addEventListener('input', () => {
      chrome.storage.local.get(['tildraSettings'], (result) => {
        const settings = result.tildraSettings || {};
        settings.overlayText = overlayTextPicker.value;
        saveSettings(settings);
        applyTheme(settings.theme, settings.accentColor, settings.popupBg, settings.popupText, settings.overlayBg, settings.overlayText);
      });
    });
  }
  if (enableHighlightingToggle) {
    enableHighlightingToggle.addEventListener('change', () => {
      chrome.storage.local.get(['tildraSettings'], (result) => {
        const settings = result.tildraSettings || {};
        settings.enableHighlighting = enableHighlightingToggle.checked;
        console.log('[Tildra Popup] enableHighlightingToggle changed to:', settings.enableHighlighting);
        saveSettings(settings);
      });
    });
  }
  // --- Export History ---
  if (exportHistoryButton) {
    exportHistoryButton.addEventListener('click', () => {
      chrome.storage.local.get(['summaryHistory'], (result) => {
        const history = result.summaryHistory || [];
        let txt = '';
        history.forEach(item => {
          txt += `Title: ${item.title}\nDate: ${item.timestamp}\nURL: ${item.url}\nTL;DR: ${item.summary}\nKey Points:\n`;
          (item.keyPoints || []).forEach(pt => { txt += `- ${pt}\n`; });
          txt += '\n---\n\n';
        });
        const blob = new Blob([txt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tildra-summary-history.txt';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      });
    });
  }
  // --- Focus Ring for Accessibility ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('user-is-tabbing');
    }
  });
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('user-is-tabbing');
  });
  // --- Accordion ARIA/Keyboard ---
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        header.click();
      }
    });
  });

  initializePopup(); // Call initialization logic

  // Developer function to reset onboarding (for testing)
  window.resetOnboarding = function() {
    chrome.storage.local.remove(['hasSeenOnboarding', 'hasSeenFirstSummary'], () => {
      console.log('Onboarding state reset. Close and reopen the extension to see onboarding again.');
      console.log('You can also call showOnboarding() directly to test the modal.');
    });
  };

  // Developer function to manually show onboarding (for testing)
  window.showOnboarding = function() {
    showOnboarding();
  };

  // --- NEW Function to display job details ---
  function displayJobDetails(jobData) {
    if (!jobCopilotDisplayArea || !jobCopilotStatus || !jobCopilotDetailsDiv || !jobTitleDisplay || !jobCompanyDisplay || !jobSourceDisplay || !jobDescriptionSnippet) {
        console.warn("[Tildra Popup] One or more Job Copilot UI elements are missing. Cannot display job details.");
        return;
    }

    jobCopilotDisplayArea.style.display = 'block'; // Show the area
    jobCopilotStatus.style.display = 'none'; // Hide the 'Detecting...' status
    jobCopilotDetailsDiv.style.display = 'block';

    jobTitleDisplay.textContent = jobData.jobTitle || 'N/A';
    jobCompanyDisplay.textContent = jobData.companyName || 'N/A';
    jobSourceDisplay.textContent = jobData.source || 'N/A';
    jobDescriptionSnippet.textContent = jobData.jobDescription ? jobData.jobDescription.substring(0, 250) + '...' : 'Not available';
    
    console.log("[Tildra Popup] Displayed job details:", jobData);
  }

  function showJobDetectionStatus(message) {
    if (!jobCopilotDisplayArea || !jobCopilotStatus || !jobCopilotDetailsDiv) return;
    jobCopilotDisplayArea.style.display = 'block';
    jobCopilotStatus.textContent = message;
    jobCopilotStatus.style.display = 'block';
    jobCopilotDetailsDiv.style.display = 'none';
  }
  // --- END NEW Function ---
});
