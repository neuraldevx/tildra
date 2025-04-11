// This script runs in the context of the extension's popup.

document.addEventListener('DOMContentLoaded', function() {
  const summarizeButton = document.getElementById('summarize-button');
  const summaryContainer = document.getElementById('summary-container');
  const tldrElement = document.getElementById('tldr');
  const keyPointsElement = document.getElementById('key-points');
  const loadingElement = document.getElementById('loading');
  const errorElement = document.getElementById('error');

  summarizeButton.addEventListener('click', () => {
    // Hide previous results/errors and show loading
    summaryContainer.style.display = 'none';
    errorElement.style.display = 'none';
    loadingElement.style.display = 'block';
    summarizeButton.disabled = true;

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
          showError('Could not get active tab.');
          return;
      }

      // Inject the content script to extract article text
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          files: ['content.js']
        },
        (injectionResults) => {
          // Check for errors during injection or script execution
          if (chrome.runtime.lastError || !injectionResults || !injectionResults[0] || !injectionResults[0].result) {
            console.error('Content script error:', chrome.runtime.lastError?.message, injectionResults);
            showError('Could not extract article content.');
            return;
          }

          const articleText = injectionResults[0].result;

          if (!articleText || articleText.trim() === '') {
              showError('Could not find meaningful content on the page.');
              return;
          }

          // Send the text to the backend
          fetch('https://snipsummary.fly.dev/summarize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ article_text: articleText }),
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            displaySummary(data.tldr, data.key_points);
          })
          .catch(error => {
            console.error('Error fetching summary:', error);
            showError('Failed to fetch summary from backend.');
          });
        }
      );
    });
  });

  function displaySummary(tldr, keyPoints) {
    loadingElement.style.display = 'none';
    errorElement.style.display = 'none';
    summarizeButton.disabled = false;

    tldrElement.textContent = tldr;
    keyPointsElement.innerHTML = ''; // Clear previous points
    keyPoints.forEach(point => {
      const li = document.createElement('li');
      li.textContent = point;
      keyPointsElement.appendChild(li);
    });
    summaryContainer.style.display = 'block';
  }

  function showError(message) {
    loadingElement.style.display = 'none';
    summaryContainer.style.display = 'none';
    summarizeButton.disabled = false;
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}); 