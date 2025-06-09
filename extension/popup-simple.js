document.addEventListener('DOMContentLoaded', function() {
    // ======= TAB NAVIGATION SYSTEM =======
    function initializeTabNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-panel]');
        const panels = document.querySelectorAll('.panel');

        function switchToPanel(targetPanelId) {
            // Hide all panels
            panels.forEach(panel => {
                panel.classList.remove('active');
                panel.hidden = true;
            });

            // Remove active class from all nav items
            navItems.forEach(item => {
                item.classList.remove('active');
            });

            // Show target panel
            const targetPanel = document.getElementById(`panel-${targetPanelId}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
                targetPanel.hidden = false;
            }

            // Activate corresponding nav item
            const targetNavItem = document.querySelector(`[data-panel="${targetPanelId}"]`);
            if (targetNavItem) {
                targetNavItem.classList.add('active');
            }

            console.log(`Switched to panel: ${targetPanelId}`);
        }

        // Add click listeners to nav items
        navItems.forEach(navItem => {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                const panelId = navItem.dataset.panel;
                if (panelId) {
                    switchToPanel(panelId);
                }
            });
        });

        // Handle "Open Tab" button
        const openTabBtn = document.querySelector('.open-tab-item');
        if (openTabBtn) {
            openTabBtn.addEventListener('click', () => {
                chrome.tabs.create({ url: 'https://www.tildra.xyz' });
            });
        }

        console.log('Tab navigation initialized');
    }

    // Initialize tab navigation first
    initializeTabNavigation();

    // ======= SUMMARIZE FUNCTIONALITY =======
    // Simple, reliable popup implementation
    const summarizeBtn = document.getElementById('summarize-button');
    const jobBtn = document.getElementById('manual-job-detect'); // Job scan button
    const summaryContainer = document.getElementById('summary-container');
    const tldrSection = document.getElementById('tldr');
    const keyPointsList = document.getElementById('key-points');
    const errorDiv = document.getElementById('error');
    const loadingProgress = document.getElementById('loading-progress');
    const progressText = document.querySelector('.progress-text');
    const summaryLengthSelect = document.getElementById('summary-length');

    // Constants
    const API_URL = 'https://tildra.fly.dev/summarize';
    const API_TIMEOUT = 25000; // 25 seconds
    const MAX_RETRIES = 1;

    // Utility functions
    function showStatus(message, isError = false) {
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.color = isError ? '#e74c3c' : '#2c3e50';
        }
        console.log(message);
    }

    function hideError() {
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    function showProgress(message = 'Processing...') {
        if (loadingProgress) {
            loadingProgress.style.display = 'block';
        }
        if (progressText) {
            progressText.textContent = message;
        }
    }

    function hideProgress() {
        if (loadingProgress) {
            loadingProgress.style.display = 'none';
        }
    }

    function setButtonState(button, loading, text = '') {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = text || 'Processing...';
            button.style.opacity = '0.7';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
            button.style.opacity = '1';
        }
    }

    function displaySummary(data) {
        hideProgress();
        hideError();
        
        if (!data || !data.tldr) {
            showStatus('Error: Invalid summary data received', true);
            return;
        }

        // Show summary container
        if (summaryContainer) {
            summaryContainer.style.display = 'block';
        }

        // Display TL;DR
        if (tldrSection) {
            tldrSection.textContent = data.tldr;
        }

        // Display key points
        if (keyPointsList && data.key_points) {
            keyPointsList.innerHTML = '';
            data.key_points.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point;
                keyPointsList.appendChild(li);
            });
        }
    }

    // Direct API call - bypass background script complexity
    async function callSummarizeAPI(content, url, title, length) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        try {
            showProgress('Sending request to AI...');

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    article_text: content,
                    url: url,
                    title: title,
                    summary_length: length || 'standard'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Daily summary limit reached! Upgrade for unlimited summaries or wait for reset tomorrow.');
                }
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.summary) {
                throw new Error('No summary returned from server');
            }

            // Parse the summary
            const lines = result.summary.split('\n').filter(line => line.trim());
            const tldr = lines.find(line => line.toLowerCase().includes('tl;dr') || line.toLowerCase().includes('summary:'))?.replace(/^(tl;dr:?|summary:?)\s*/i, '') || lines[0] || 'Summary unavailable';
            
            const keyPoints = lines.filter(line => 
                line.trim().startsWith('•') || 
                line.trim().startsWith('-') || 
                line.trim().startsWith('*') ||
                /^\d+\./.test(line.trim())
            ).map(line => line.replace(/^[•\-*\d\.]\s*/, '').trim()).filter(point => point.length > 0);

            // If no key points found, split the summary into sentences
            if (keyPoints.length === 0 && lines.length > 1) {
                const sentences = result.summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
                keyPoints.push(...sentences.slice(1, 4).map(s => s.trim()));
            }

            return {
                tldr: tldr,
                key_points: keyPoints.length > 0 ? keyPoints : ['Summary processed successfully']
            };

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            
            throw error;
        }
    }

    // Get page content via content script
    async function getPageContent() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0]) {
                    reject(new Error('No active tab found'));
                    return;
                }

                const tab = tabs[0];
                
                // Try to get content from content script
                chrome.tabs.sendMessage(tab.id, { action: 'getContent' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Could not access page content. Please refresh the page and try again.'));
                        return;
                    }

                    if (!response || !response.content) {
                        reject(new Error('No content found on this page'));
                        return;
                    }

                    if (response.content.trim().length < 100) {
                        reject(new Error('Page content is too short to summarize'));
                        return;
                    }

                    resolve({
                        content: response.content,
                        url: tab.url,
                        title: tab.title
                    });
                });
            });
        });
    }

    // Main summarize function
    async function summarize() {
        if (!summarizeBtn) return;
        
        setButtonState(summarizeBtn, true, 'Extracting...');
        hideError();
        showProgress('Extracting page content...');

        try {
            // Step 1: Get page content
            const pageData = await getPageContent();
            
            // Step 2: Call API directly
            showProgress('Generating summary...');
            setButtonState(summarizeBtn, true, 'AI Processing...');
            
            const length = summaryLengthSelect ? summaryLengthSelect.value : 'standard';
            const summaryData = await callSummarizeAPI(
                pageData.content, 
                pageData.url, 
                pageData.title, 
                length
            );

            // Step 3: Display result
            displaySummary(summaryData);
            showStatus('✅ Summary generated successfully!');
            setTimeout(hideError, 3000);

        } catch (error) {
            console.error('Summarize error:', error);
            hideProgress();
            showStatus(error.message, true);
            
            // Hide summary container on error
            if (summaryContainer) {
                summaryContainer.style.display = 'none';
            }
        } finally {
            setButtonState(summarizeBtn, false);
            hideProgress();
        }
    }

    // Job detection with improved UI feedback
    async function detectJob() {
        const jobStatus = document.getElementById('job-copilot-status');
        const statusTitle = jobStatus?.querySelector('.status-title');
        const statusMessage = jobStatus?.querySelector('.status-message');

        function updateJobStatus(title, message, isSuccess = false) {
            if (statusTitle) statusTitle.textContent = title;
            if (statusMessage) statusMessage.textContent = message;
            
            // Also show in main status area
            showStatus(`${title} - ${message}`, !isSuccess);
        }

        try {
            setButtonState(jobBtn, true, 'Scanning...');
            updateJobStatus('🔍 Scanning Page', 'Looking for job posting details...');

            const tabs = await new Promise((resolve, reject) => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(tabs);
                    }
                });
            });

            if (!tabs[0]) {
                throw new Error('No active tab found');
            }

            // Send message to content script for job detection
            chrome.tabs.sendMessage(tabs[0].id, { action: 'triggerJobDetection' }, (response) => {
                if (chrome.runtime.lastError) {
                    updateJobStatus('❌ Detection Failed', 'Could not access page content');
                    showStatus('❌ Job scanning failed: Could not access page', true);
                } else if (response && response.success && response.jobDetails) {
                    updateJobStatus('✅ Job Detected!', 'Found job posting on this page', true);
                    showStatus('✅ Job detected! Review details below.', false);
                    
                    // Show job badge
                    const badge = document.getElementById('job-copilot-badge');
                    if (badge) badge.style.display = 'inline-block';
                    
                    // Display job details
                    displayJobDetails(response.jobDetails);
                } else {
                    updateJobStatus('❌ No Job Found', 'This page doesn\'t appear to contain a job posting');
                    showStatus('❌ No job posting found on this page', true);
                }
                
                setTimeout(hideError, 5000);
                setButtonState(jobBtn, false);
            });

        } catch (error) {
            console.error('Job detection error:', error);
            updateJobStatus('❌ Error', error.message);
            showStatus(`❌ Job scanning failed: ${error.message}`, true);
            setButtonState(jobBtn, false);
        }
    }

    // Event listeners
    if (summarizeBtn) {
        summarizeBtn.addEventListener('click', summarize);
    }

    if (jobBtn) {
        jobBtn.addEventListener('click', detectJob);
    }

    // Initialize
    hideError();
    hideProgress();
    
    if (summaryContainer) {
        summaryContainer.style.display = 'none';
    }

    console.log('Simple popup initialized');
}); 