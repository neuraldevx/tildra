// This script runs in the context of the extension's popup.

// Wait for the DOM to be fully loaded before running script logic
document.addEventListener('DOMContentLoaded', () => {
  const summarizeButton = document.getElementById('summarize-button');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const summaryDiv = document.getElementById('summary');
  const tldrSection = document.getElementById('tldr');
  const keyPointsList = document.getElementById('keyPoints');
  const errorDiv = document.getElementById('error');
  const copyButton = document.getElementById('copy-button');

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
  if (!loadingSpinner || !summaryDiv || !tldrSection || !keyPointsList || !errorDiv) {
      console.error("Error: One or more required UI elements not found.");
      // This is likely critical, stop execution
      return;
  }
  // --- End Edit ---

  // Function to show loading state
  function showLoading(isLoading) {
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
  }

  // Function to display summary
  function displaySummary(summaryData) {
    summaryDiv.style.display = 'block';
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
    summaryDiv.style.display = 'none';
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

  summarizeButton.addEventListener('click', () => {
    clearState();
    showLoading(true);

    // Get current tab to inject content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab || !currentTab.id) {
        displayError("Could not get current tab information.");
        showLoading(false);
        return;
      }

      // Inject content script to get article text
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: getArticleContent, // Function defined below or in content.js
      },
      async (injectionResults) => { // Make this callback async
        // Handle errors from injection or script execution
        if (chrome.runtime.lastError || !injectionResults || !injectionResults[0]) {
          let errorMessage = chrome.runtime.lastError ? chrome.runtime.lastError.message : "Script injection failed.";
          console.error("Content script error:", errorMessage);
          // Check for common errors
          if (errorMessage.includes("Cannot access a chrome:// URL")) {
            errorMessage = "Cannot summarize Chrome internal pages.";
          } else if (errorMessage.includes("Cannot access contents of the page")) {
            errorMessage = "Cannot access this page. Check extension permissions.";
          }
          displayError(errorMessage);
          showLoading(false);
          return;
        }

        const result = injectionResults[0].result;

        if (result.error) {
          console.error("Error extracting content:", result.error);
          displayError(result.error);
          showLoading(false);
          return;
        }

        const articleText = result.content;
        if (!articleText || articleText.trim().length < 50) {
          displayError("Could not extract enough content to summarize. Is this an article page?");
          showLoading(false);
          return;
        }

        // --- Start Edit: Get token and make authenticated API call --- 
        let sessionToken = null;
        try {
          sessionToken = await getClerkSessionToken();
          if (!sessionToken) {
            displayError("Not logged in. Please log in to tildra.xyz first.");
            showLoading(false);
            return;
          }
        } catch (error) {
          displayError(`Error getting auth token: ${error.message}`);
          showLoading(false);
          return;
        }

        // Fetch summary from backend
        fetch(BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}` // Add the token here
          },
          body: JSON.stringify({ article_text: articleText })
        })
        // --- End Edit ---
        .then(response => {
          if (!response.ok) {
            // Try to get error detail from response body if available
            return response.json().catch(() => null).then(errorData => {
              let detail = (errorData && errorData.detail) ? errorData.detail : `HTTP error! status: ${response.status}`;
              throw new Error(detail);
            });
          }
          return response.json();
        })
        .then(data => {
          displaySummary(data);
        })
        .catch(error => {
          console.error('Error fetching summary:', error);
          displayError(`Failed to fetch summary: ${error.message}`);
        })
        .finally(() => {
          showLoading(false);
        });
      });
    });
  });

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
      // Return an error object structure
      return { error: "Readability library not loaded on the page.", content: null }; 
    }

    try {
      const documentClone = document.cloneNode(true);
      const reader = new Readability(documentClone, { 
        // Optional: You might want to disable debug logging
        // debug: true 
      });
      const article = reader.parse();

      if (article && article.textContent) {
        return { error: null, content: article.textContent };
      } else {
        console.warn("SnipSummary (injected): Readability could not parse article content.");
        // Fallback logic (keep it simple for injection)
        const mainElement = document.querySelector('main');
        let fallbackContent = document.body ? document.body.innerText : '';
        if (mainElement && mainElement.innerText) {
          fallbackContent = mainElement.innerText;
        }
        return { error: "Readability could not parse effectively.", content: fallbackContent }; // Still return content if fallback worked
      }
    } catch (e) {
      console.error("SnipSummary (injected): Error during Readability parsing:", e);
      // Fallback in case of error
      let fallbackContent = document.body ? document.body.innerText : '';
      const mainElement = document.querySelector('main');
      if (mainElement && mainElement.innerText) {
        fallbackContent = mainElement.innerText;
      }
      return { error: `Readability parsing failed: ${e.message}`, content: fallbackContent }; 
    }
  }
}); 