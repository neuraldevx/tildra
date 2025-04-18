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

  // Set based on your deployed backend URL
  // Ensure this matches the host_permissions in manifest.json
  const BACKEND_URL = 'https://snipsummary.fly.dev/summarize';
  const COOKIE_DOMAIN_URL = 'https://www.tildra.xyz'; // Domain where the auth cookie is set
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

  // Function to show loading state
  function showLoading(isLoading) {
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
  }

  // Function to display summary
  function displaySummary(summaryData) {
    summaryContainer.style.display = 'block';
    copyButton.style.display = 'inline-block'; // Ensure copy button is visible
    tldrSection.textContent = summaryData.tldr;
    keyPointsList.innerHTML = ''; // Clear previous points
    summaryData.key_points.forEach(point => {
      const li = document.createElement('li');
      li.textContent = point;
      keyPointsList.appendChild(li);
    });
  }

  // Function to display errors
  function displayError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    copyButton.style.display = 'none'; // Hide copy button on error
  }

  // Function to clear previous state
  function clearState() {
    summaryContainer.style.display = 'none';
    errorDiv.style.display = 'none';
    copyButton.disabled = false; // Re-enable copy button if it was disabled
    copyButton.style.display = 'none'; // Hide copy button initially
    tldrSection.textContent = '';
    keyPointsList.innerHTML = '';
  }

  // --- Start Edit: Add function to get Clerk session cookie ---
  async function getClerkSessionToken() {
    return new Promise((resolve, reject) => {
      if (!chrome || !chrome.cookies) {
        return reject(new Error("Chrome cookies API is not available."));
      }
      chrome.cookies.get({ url: COOKIE_DOMAIN_URL, name: COOKIE_NAME }, (cookie) => {
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
    // **Placeholder:** In a real scenario, this would make an authenticated API call
    // to your backend to check the user's subscription status.
    console.log('[Tildra Popup] Checking user status (placeholder)...');
    try {
      // Example: const response = await fetch('/api/user/status', { headers: { Authorization: `Bearer ${token}` }});
      // const data = await response.json();
      // return data.is_pro; // Assuming backend returns { is_pro: true/false }
      
      // For now, return false for testing the free user view
       return false; 
      // To test the pro user view, change the above line to: return true;
    } catch (error) {
      console.error('Error fetching user status:', error);
      return false; // Default to free user state on error
    }
  }
  // --- END ADD ---

  // --- Setup --- 
  const footerUpsell = document.querySelector('.footer'); // Get footer element

  // Tab Switching Logic
  function switchTab(targetTab) {
    const isSummarize = targetTab === summarizeTab;
    
    // Update button states and ARIA attributes
    summarizeTab.classList.toggle('active', isSummarize);
    historyTab.classList.toggle('active', !isSummarize);
    summarizeTab.setAttribute('aria-selected', isSummarize);
    historyTab.setAttribute('aria-selected', !isSummarize);

    // Update panel visibility using the hidden attribute ONLY
    summarizePanel.hidden = !isSummarize;
    historyPanel.hidden = isSummarize;

    // Move underline
    if (tabUnderline) {
      tabUnderline.style.transform = isSummarize ? 'translateX(0%)' : 'translateX(100%)';
    }

    // Load history only when switching to history tab
    if (!isSummarize) {
      loadHistorySummaries();
    }
  }

  if (summarizeTab && historyTab) {
    summarizeTab.addEventListener('click', () => switchTab(summarizeTab));
    historyTab.addEventListener('click', () => switchTab(historyTab));
  }

  summarizeButton.addEventListener('click', () => {
    if (summarizeButton.getAttribute('aria-busy') === 'true') return; // Prevent multiple clicks

    clearState();
    summarizeButton.setAttribute('aria-busy', 'true');
    const originalButtonText = summarizeButton.textContent;
    summarizeButton.textContent = 'Summarizing...'; // Change text while loading

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab || !currentTab.id) {
        displayError("Could not get current tab info.");
        summarizeButton.removeAttribute('aria-busy');
        summarizeButton.textContent = originalButtonText;
        return;
      }

      // Inject Readability.js first
      chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ["Readability.js"] }, () => {
        if (chrome.runtime.lastError) {
          console.error("Inject Readability Error:", chrome.runtime.lastError.message);
          displayError(`Failed to inject script: ${chrome.runtime.lastError.message}`);
          summarizeButton.removeAttribute('aria-busy');
          summarizeButton.textContent = originalButtonText;
          return;
        }

        // Inject function to get content
        chrome.scripting.executeScript({ target: { tabId: currentTab.id }, function: getArticleContent }, async (injectionResults) => {
          // Reset button state regardless of outcome
          const resetButtonState = () => {
            summarizeButton.removeAttribute('aria-busy');
            summarizeButton.textContent = originalButtonText;
          };

          if (chrome.runtime.lastError || !injectionResults || !injectionResults[0]) {
            let msg = chrome.runtime.lastError ? chrome.runtime.lastError.message : "Content script error.";
            if (msg.includes("Cannot access a chrome:// URL")) msg = "Cannot summarize Chrome pages.";
            else if (msg.includes("Cannot access contents")) msg = "Cannot access this page.";
            console.error("Injection Error:", msg);
            displayError(msg);
            resetButtonState();
            return;
          }

          const result = injectionResults[0].result;
          if (result.error) {
            console.error("Content Extraction Error:", result.error);
            displayError(result.error);
            resetButtonState();
            return;
          }

          const articleText = result.content;
          if (!articleText || articleText.trim().length < 50) {
            displayError("Not enough content found to summarize.");
            resetButtonState();
            return;
          }

          let sessionToken = null;
          try {
            sessionToken = await getClerkSessionToken();
            if (!sessionToken) {
              displayError("Please log in to tildra.xyz first.");
              resetButtonState();
              return;
            }
          } catch (error) {
            displayError(`Auth Error: ${error.message}`);
            resetButtonState();
            return;
          }

          // Use background script for the API call
          chrome.runtime.sendMessage(
            { action: 'summarizeAPI', textContent: articleText, token: sessionToken }, 
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("BG message error:", chrome.runtime.lastError.message);
                displayError(`Communication error: ${chrome.runtime.lastError.message}`);
              } else if (response && response.success) {
                displaySummary(response.summaryData);
              } else if (response && response.expired) {
                displayError("Session expired. Please log back in to tildra.xyz.");
              } else {
                displayError(`API Error: ${response?.error || 'Unknown error'}`);
              }
              resetButtonState(); // Reset button AFTER response
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
      copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
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
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      // Format as date
      return date.toLocaleDateString();
    }
  }

  // Load summaries from storage
  function loadHistorySummaries() {
    chrome.storage.local.get(['summaryHistory'], (result) => {
      const history = result.summaryHistory || [];
      
      // Show/hide empty state
      if (history.length === 0) {
        historyEmpty.style.display = 'block';
        historyList.style.display = 'none';
        clearHistoryButton.style.display = 'none'; // Hide clear button if no history
        return;
      }
      
      // Display history items
      historyEmpty.style.display = 'none';
      historyList.style.display = 'block';
      historyList.innerHTML = '';
      
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
  // By default, the Summarize tab is active, so no initial history load needed.

  // Header button to open website
  if (openTabButton) {
    openTabButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.tildra.xyz' }); // Point to actual site
    });
  }

  // --- Initial Load --- 
  // Check user status and update UI accordingly
  async function initializePopup() {
    const isProUser = await getUserStatus();
    console.log('[Tildra Popup] User is Pro:', isProUser);

    if (isProUser && footerUpsell) {
      footerUpsell.style.display = 'none'; // Hide footer for pro users
    } else if (footerUpsell) {
      footerUpsell.style.display = 'block'; // Ensure footer is visible for free users
    }
    
    // Optionally add a message for pro users somewhere else?
    // For now, just hiding the upsell is the main requirement.
  }

  initializePopup(); // Call initialization logic
});
