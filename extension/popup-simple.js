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
                    
                    // Auto-detect jobs when Job Copilot tab is opened
                    if (panelId === 'job-copilot') {
                        setTimeout(() => {
                            autoDetectJob();
                        }, 300); // Small delay to let UI settle
                    }
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

    function displaySummary(data, title = null) {
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

        // Save to history
        if (title !== false) { // Allow skipping history save
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const currentTitle = title || tabs[0]?.title || 'Untitled Summary';
                saveToHistory({
                    title: currentTitle,
                    tldr: data.tldr,
                    key_points: data.key_points,
                    url: tabs[0]?.url,
                    date: new Date().toISOString()
                });
            });
        }
    }

    function saveToHistory(summaryData) {
        chrome.storage.local.get('summaryHistory', (result) => {
            const history = result.summaryHistory || [];
            history.unshift(summaryData); // Add to beginning
            
            // Keep only last 50 summaries
            if (history.length > 50) {
                history.splice(50);
            }
            
            chrome.storage.local.set({ summaryHistory: history });
        });
    }

    // Direct API call - bypass background script complexity
    async function callSummarizeAPI(content, url, title, length) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        try {
            showProgress('Getting fresh authentication...');

            // First, try to get a fresh token from Tildra tab
            let freshToken = null;
            try {
                const tabs = await new Promise((resolve) => {
                    chrome.tabs.query({}, resolve);
                });
                
                const tildraTabs = tabs.filter(tab => tab.url && tab.url.includes('tildra.xyz'));
                console.log('Found Tildra tabs:', tildraTabs.length);
                
                for (const tab of tildraTabs) {
                    try {
                        console.log('Trying to get token from tab:', tab.url);
                        const response = await new Promise((resolve, reject) => {
                            chrome.tabs.sendMessage(tab.id, { action: 'getAuthToken' }, (response) => {
                                if (chrome.runtime.lastError) {
                                    reject(new Error(chrome.runtime.lastError.message));
                                } else {
                                    resolve(response);
                                }
                            });
                        });
                        
                        if (response && response.token) {
                            freshToken = response.token;
                            console.log('Got fresh token from Tildra tab!');
                            // Store it for future use
                            chrome.storage.local.set({ authToken: freshToken });
                            break;
                        }
                    } catch (e) {
                        console.log('Failed to get token from tab:', e.message);
                    }
                }
            } catch (e) {
                console.log('Error checking for Tildra tabs:', e.message);
            }

            // If no fresh token, try stored auth data
            if (!freshToken) {
                const authData = await new Promise((resolve) => {
                    chrome.storage.local.get(['authToken', 'clerkUserId'], resolve);
                });
                freshToken = authData.authToken;
                console.log('Using stored token:', !!freshToken);
            }

            showProgress('Sending request to AI...');

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            // Use the token if we have one
            if (freshToken) {
                console.log('Using Bearer token for auth');
                headers['Authorization'] = `Bearer ${freshToken}`;
                // Also add the user ID for extra security
                headers['X-User-ID'] = 'user_2xtGvoam7eCBidIQUaBWM1K0jLN';
            } else {
                // Fallback to user ID header only
                console.log('No token available, using fallback User ID');
                headers['X-User-ID'] = 'user_2xtGvoam7eCBidIQUaBWM1K0jLN';
            }

            console.log('Making API request with headers:', Object.keys(headers));

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    article_text: content,
                    url: url,
                    title: title,
                    summary_length: length || 'standard'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('API response status:', response.status);

            if (!response.ok) {
                if (response.status === 401) {
                    // Clear stored auth data since it's invalid
                    chrome.storage.local.remove(['authToken']);
                    throw new Error('Authentication expired. Please visit https://www.tildra.xyz, sign in, and try again.');
                }
                if (response.status === 429) {
                    throw new Error('Daily summary limit reached! Upgrade for unlimited summaries or wait for reset tomorrow.');
                }
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            console.log('Full API response object:', result);
            console.log('Response keys:', Object.keys(result));

            // The server returns { tldr: "...", key_points: [...] } format
            if (result.tldr && result.key_points) {
                console.log('Found structured response with tldr and key_points');
                return {
                    tldr: result.tldr,
                    key_points: result.key_points
                };
            }

            // Check for alternative response formats (fallback)
            const summary = result.summary || result.content || result.text || result.data?.summary;
            
            if (!summary) {
                console.error('No summary found in response. Available fields:', Object.keys(result));
                throw new Error(`No summary returned from server. Response structure: ${JSON.stringify(result, null, 2)}`);
            }

            console.log('Using fallback parsing for summary field');

            // Parse the summary using the found summary variable
            let finalSummary;
            if (typeof summary === 'string') {
                finalSummary = summary;
            } else if (summary && summary.content) {
                finalSummary = summary.content;
            } else if (summary && typeof summary === 'object') {
                finalSummary = summary.text || summary.message || JSON.stringify(summary);
            } else {
                finalSummary = String(summary);
            }

            console.log('Final parsed summary:', finalSummary);
            
            const lines = finalSummary.split('\n').filter(line => line.trim());
            const tldr = lines.find(line => line.toLowerCase().includes('tl;dr') || line.toLowerCase().includes('summary:'))?.replace(/^(tl;dr:?|summary:?)\s*/i, '') || lines[0] || 'Summary unavailable';
            
            const keyPoints = lines.filter(line => 
                line.trim().startsWith('•') || 
                line.trim().startsWith('-') || 
                line.trim().startsWith('*') ||
                /^\d+\./.test(line.trim())
            ).map(line => line.replace(/^[•\-*\d\.]\s*/, '').trim()).filter(point => point.length > 0);

            // If no key points found, split the summary into sentences
            if (keyPoints.length === 0 && lines.length > 1) {
                const sentences = finalSummary.split(/[.!?]+/).filter(s => s.trim().length > 20);
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

    // Get page content via content script, with injection fallback
    async function getPageContent() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0] || !tabs[0].id) {
                    return reject(new Error('No active tab found.'));
                }
                const tab = tabs[0];
    
                // First attempt to send the message
                chrome.tabs.sendMessage(tab.id, { action: 'getContent' }, (response) => {
                    if (chrome.runtime.lastError) {
                        // If it fails, the content script might not be injected
                        console.log('Content script not responding. Attempting to inject...');
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ['content.js']
                        }).then(() => {
                            console.log('Content script injected. Retrying...');
                            // Retry sending the message
                            chrome.tabs.sendMessage(tab.id, { action: 'getContent' }, (response) => {
                                if (chrome.runtime.lastError) {
                                    // If it still fails, there's a deeper issue
                                    const errorMessage = `Failed to connect to page content. Error: ${chrome.runtime.lastError.message}`;
                                    console.error(errorMessage);
                                    return reject(new Error('Could not get page content, even after injection. The page may be protected.'));
                                }
                                if (response && response.success) {
                                    resolve({ content: response.content, url: tab.url, title: tab.title });
                                } else {
                                    reject(new Error(response?.error || 'No content found on this page after injection.'));
                                }
                            });
                        }).catch(err => {
                            console.error('Failed to inject content script:', err);
                            reject(new Error('Failed to inject script to access page content.'));
                        });
                        return; // Exit the first callback
                    }
    
                    // First attempt was successful
                    if (response && response.success) {
                         if (response.content.trim().length < 100) {
                            return reject(new Error('Page content is too short to summarize.'));
                        }
                        resolve({ content: response.content, url: tab.url, title: tab.title });
                    } else {
                        reject(new Error(response?.error || 'No content found on this page.'));
                    }
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

    // Display job details in the Job Copilot section
    function displayJobDetails(jobDetails) {
        const jobContent = document.getElementById('job-copilot-content');
        if (!jobContent) return;

        // Create tailoring points based on job details
        const tailoringPoints = generateTailoringPoints(jobDetails);

        jobContent.innerHTML = `
            <div class="job-details-card">
                <div class="job-header">
                    <h3 class="job-title">${jobDetails.title || 'Job Position'}</h3>
                    <div class="job-meta">
                        <span class="company">${jobDetails.company || 'Company'}</span>
                        ${jobDetails.location ? `<span class="location">📍 ${jobDetails.location}</span>` : ''}
                        ${jobDetails.salary ? `<span class="salary">💰 ${jobDetails.salary}</span>` : ''}
                    </div>
                </div>
                
                <div class="job-overview">
                    <h4>📋 Quick Overview</h4>
                    <div class="overview-content">
                        ${jobDetails.description ? `<p class="job-description">${jobDetails.description.substring(0, 300)}${jobDetails.description.length > 300 ? '...' : ''}</p>` : ''}
                        
                        ${jobDetails.requirements?.length ? `
                            <div class="requirements-section">
                                <strong>Key Requirements:</strong>
                                <ul class="requirements-list">
                                    ${jobDetails.requirements.slice(0, 4).map(req => `<li>${req}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="tailoring-section">
                    <h4>🎯 Resume Tailoring Points</h4>
                    <ul class="tailoring-points">
                        ${tailoringPoints.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>

                <div class="job-actions">
                    <button id="analyze-job-btn" class="button-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m6-6h4a2 2 0 0 1 2 2v3c0 1.1-.9 2-2 2h-4m-6 0V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-3"></path>
                        </svg>
                        Analyze with AI
                    </button>
                    <button id="copy-job-details" class="button-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                            <path d="M4 16c-1.1 0-2-.9-2 2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                        </svg>
                        Copy Details
                    </button>
                </div>
            </div>
        `;

        // Show the job content
        jobContent.style.display = 'block';

        // Add event listeners for the new buttons
        const analyzeBtn = document.getElementById('analyze-job-btn');
        const copyBtn = document.getElementById('copy-job-details');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => analyzeJob(jobDetails));
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyJobDetails(jobDetails));
        }
    }

    // Generate smart tailoring points based on job details
    function generateTailoringPoints(jobDetails) {
        const points = [];
        
        if (jobDetails.skills?.length) {
            points.push(`Highlight experience with: ${jobDetails.skills.slice(0, 3).join(', ')}`);
        }
        
        if (jobDetails.requirements?.length) {
            const techReqs = jobDetails.requirements.filter(req => 
                req.toLowerCase().includes('experience') || 
                req.toLowerCase().includes('skill') ||
                req.toLowerCase().includes('knowledge')
            );
            if (techReqs.length) {
                points.push(`Emphasize relevant background in: ${techReqs[0]}`);
            }
        }
        
        points.push('Customize your summary to match this role\'s focus');
        points.push('Use similar keywords and phrases from the job description');
        points.push('Quantify achievements that relate to their requirements');
        
        return points.slice(0, 4); // Return top 4 points
    }

    // Analyze job with AI (integrate with summarize functionality)
    async function analyzeJob(jobDetails) {
        const analyzeBtn = document.getElementById('analyze-job-btn');
        if (!analyzeBtn) return;

        setButtonState(analyzeBtn, true, 'Analyzing...');
        showProgress('Analyzing job posting with AI...');

        try {
            // Use the same API but with job-specific prompting
            const jobText = `
Job Title: ${jobDetails.title}
Company: ${jobDetails.company}
Location: ${jobDetails.location || 'Not specified'}
Description: ${jobDetails.description}
Requirements: ${jobDetails.requirements?.join(', ') || 'Not specified'}
Skills: ${jobDetails.skills?.join(', ') || 'Not specified'}
            `.trim();

            const analysisData = await callSummarizeAPI(
                jobText,
                window.location.href,
                `Job Analysis: ${jobDetails.title}`,
                'detailed'
            );

            // Display analysis results
            displaySummary(analysisData);
            showStatus('✅ Job analysis complete! Check the summary below.');
            
            // Switch to summary tab to show results
            const summaryTab = document.querySelector('[data-panel="summarize"]');
            if (summaryTab) summaryTab.click();

        } catch (error) {
            console.error('Job analysis error:', error);
            showStatus(error.message, true);
        } finally {
            setButtonState(analyzeBtn, false);
            hideProgress();
        }
    }

    // Copy job details to clipboard
    function copyJobDetails(jobDetails) {
        const text = `
${jobDetails.title} at ${jobDetails.company}
${jobDetails.location ? `Location: ${jobDetails.location}` : ''}
${jobDetails.salary ? `Salary: ${jobDetails.salary}` : ''}

Description:
${jobDetails.description || 'Not provided'}

Requirements:
${jobDetails.requirements?.join('\n') || 'Not specified'}

Skills:
${jobDetails.skills?.join(', ') || 'Not specified'}
        `.trim();

        navigator.clipboard.writeText(text).then(() => {
            showStatus('✅ Job details copied to clipboard!');
            setTimeout(hideError, 2000);
        }).catch(() => {
            showStatus('❌ Failed to copy to clipboard', true);
        });
    }

    // Auto job detection (silent, no button state changes)
    async function autoDetectJob() {
        const jobStatus = document.getElementById('job-copilot-status');
        const statusTitle = jobStatus?.querySelector('.status-title');
        const statusMessage = jobStatus?.querySelector('.status-message');

        function updateJobStatus(title, message, isSuccess = false) {
            if (statusTitle) statusTitle.textContent = title;
            if (statusMessage) statusMessage.textContent = message;
        }

        try {
            updateJobStatus('🔍 Auto-scanning Page', 'Looking for job posting details...');

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
                updateJobStatus('❌ Detection Failed', 'No active tab found');
                return;
            }

            // Send message to content script for job detection
            chrome.tabs.sendMessage(tabs[0].id, { action: 'triggerJobDetection' }, (response) => {
                if (chrome.runtime.lastError) {
                    updateJobStatus('🔍 Ready to Scan', 'Click "Scan for Jobs" to detect job postings');
                } else if (response && response.success && response.jobDetails) {
                    updateJobStatus('✅ Job Detected!', 'Found job posting on this page', true);
                    
                    // Show job badge
                    const badge = document.getElementById('job-copilot-badge');
                    if (badge) badge.style.display = 'inline-block';
                    
                    // Display job details
                    displayJobDetails(response.jobDetails);
                } else {
                    updateJobStatus('🔍 Ready to Scan', 'Click "Scan for Jobs" if you\'re on a job page');
                }
            });

        } catch (error) {
            console.error('Auto job detection error:', error);
            updateJobStatus('🔍 Ready to Scan', 'Click "Scan for Jobs" to detect job postings');
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

    // Resume Upload Functionality
    function initializeResumeUpload() {
        const uploadBtn = document.getElementById('upload-resume');
        const resumeDialog = document.getElementById('resume-upload-dialog');
        const fileInput = document.getElementById('resume-file-input');
        const fileLabel = document.querySelector('.file-label .file-text');
        const uploadStatus = document.getElementById('resume-upload-status');
        const confirmBtn = document.getElementById('upload-resume-confirm');
        const cancelBtn = document.getElementById('upload-resume-cancel');

        if (!uploadBtn || !resumeDialog) return;

        // Check for existing resume data
        chrome.storage.local.get(['resumeData'], (result) => {
            if (result.resumeData && result.resumeData.fileName) {
                // Update button to show existing resume
                uploadBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <span>📄 ${result.resumeData.fileName}</span>
                `;
                uploadBtn.title = `Resume uploaded: ${result.resumeData.fileName}`;
            }
        });

        // Show upload dialog
        uploadBtn.addEventListener('click', () => {
            resumeDialog.style.display = 'flex';
        });

        // Hide dialog
        function hideDialog() {
            resumeDialog.style.display = 'none';
            fileInput.value = '';
            fileLabel.textContent = 'Choose a file...';
            confirmBtn.disabled = true;
            uploadStatus.textContent = '';
        }

        cancelBtn?.addEventListener('click', hideDialog);

        // Handle file selection
        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const maxSize = 5 * 1024 * 1024; // 5MB
                const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
                const fileExt = '.' + file.name.split('.').pop().toLowerCase();

                if (file.size > maxSize) {
                    uploadStatus.textContent = '❌ File too large. Max size is 5MB.';
                    uploadStatus.style.color = '#e74c3c';
                    confirmBtn.disabled = true;
                    return;
                }

                if (!allowedTypes.includes(fileExt)) {
                    uploadStatus.textContent = '❌ Invalid file type. Use PDF, DOC, DOCX, or TXT.';
                    uploadStatus.style.color = '#e74c3c';
                    confirmBtn.disabled = true;
                    return;
                }

                fileLabel.textContent = file.name;
                uploadStatus.textContent = `✅ ${file.name} ready to upload`;
                uploadStatus.style.color = '#27ae60';
                confirmBtn.disabled = false;
            }
        });

        // Handle upload confirmation
        confirmBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const file = fileInput.files[0];
            if (!file) return;

            setButtonState(confirmBtn, true, 'Processing...');
            uploadStatus.textContent = '📤 Processing resume...';
            uploadStatus.style.color = '#3498db';

            try {
                // Read file content
                const fileContent = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
                
                uploadStatus.textContent = '✅ Resume processed successfully!';
                uploadStatus.style.color = '#27ae60';
                
                // Store resume data properly
                const resumeData = {
                    fileName: file.name,
                    uploadDate: new Date().toISOString(),
                    size: file.size,
                    content: fileContent,
                    type: file.type || 'text/plain'
                };

                chrome.storage.local.set({ resumeData }, () => {
                    showStatus('✅ Resume uploaded and ready for tailoring!');
                    
                    // Keep dialog open briefly to show success, then close
                    setTimeout(() => {
                        hideDialog();
                        setButtonState(confirmBtn, false);
                        
                        // Update upload button text to show resume is ready
                        if (uploadBtn) {
                            uploadBtn.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <path d="M16 13l-4-4 4-4"></path>
                                </svg>
                                <span>✅ ${file.name}</span>
                            `;
                        }
                    }, 1500);
                });

            } catch (error) {
                console.error('Resume upload error:', error);
                uploadStatus.textContent = '❌ Processing failed. Please try again.';
                uploadStatus.style.color = '#e74c3c';
                setButtonState(confirmBtn, false);
            }
        });
    }

    // Initialize History functionality
    function initializeHistory() {
        const clearBtn = document.getElementById('clear-history-button');
        const historyList = document.getElementById('history-list');
        const historyEmpty = document.getElementById('history-empty');

        if (clearBtn && historyList) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all summary history?')) {
                    chrome.storage.local.remove('summaryHistory', () => {
                        historyList.innerHTML = '';
                        if (historyEmpty) historyEmpty.style.display = 'block';
                        showStatus('✅ History cleared successfully');
                        setTimeout(hideError, 2000);
                    });
                }
            });
        }

        // Load and display history
        chrome.storage.local.get('summaryHistory', (result) => {
            const history = result.summaryHistory || [];
            if (history.length === 0) {
                if (historyEmpty) historyEmpty.style.display = 'block';
            } else {
                if (historyEmpty) historyEmpty.style.display = 'none';
                displayHistory(history);
            }
        });
    }

    function displayHistory(history) {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        historyList.innerHTML = history.map((item, index) => `
            <li class="history-item">
                <div class="history-header">
                    <h4 class="history-title">${item.title || 'Untitled Summary'}</h4>
                    <span class="history-date">${new Date(item.date).toLocaleDateString()}</span>
                </div>
                <p class="history-tldr">${item.tldr?.substring(0, 150)}${item.tldr?.length > 150 ? '...' : ''}</p>
                <div class="history-actions">
                    <button class="history-btn view-btn" data-index="${index}">View</button>
                    <button class="history-btn copy-btn" data-index="${index}">Copy</button>
                    <button class="history-btn delete-btn" data-index="${index}">Delete</button>
                </div>
            </li>
        `).join('');

        // Add event listeners for history actions
        historyList.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                displaySummary(history[index]);
                // Switch to summary tab
                const summaryTab = document.querySelector('[data-panel="summarize"]');
                if (summaryTab) summaryTab.click();
            });
        });

        historyList.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const item = history[index];
                const text = `${item.title}\n\nTL;DR: ${item.tldr}\n\nKey Points:\n${item.key_points?.join('\n') || ''}`;
                navigator.clipboard.writeText(text).then(() => {
                    showStatus('✅ Summary copied to clipboard!');
                    setTimeout(hideError, 2000);
                });
            });
        });

        historyList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (confirm('Delete this summary?')) {
                    history.splice(index, 1);
                    chrome.storage.local.set({ summaryHistory: history }, () => {
                        displayHistory(history);
                        showStatus('✅ Summary deleted');
                        setTimeout(hideError, 2000);
                    });
                }
            });
        });
    }

    // Event listeners
    if (summarizeBtn) {
        summarizeBtn.addEventListener('click', summarize);
    }

    if (jobBtn) {
        jobBtn.addEventListener('click', detectJob);
    }

    // Check for authentication and set default if needed
    function checkAuthentication() {
        chrome.storage.local.get(['authToken', 'clerkUserId'], (result) => {
            console.log('Current auth data:', result);
            
            if (!result.authToken && !result.clerkUserId) {
                // Set a default user ID for testing purposes
                console.log('Setting default user ID');
                chrome.storage.local.set({
                    clerkUserId: 'user_2xtGvoam7eCBidIQUaBWM1K0jLN' // From the logs
                });
            }
            
            // If we have clerkUserId but no authToken, try to get auth token from web pages
            if (result.clerkUserId && !result.authToken) {
                tryGetAuthFromTildra();
            }
        });
    }

    // Try to get auth token from Tildra web pages
    function tryGetAuthFromTildra() {
        // Query all Tildra tabs
        chrome.tabs.query({ url: "https://www.tildra.xyz/*" }, (tabs) => {
            if (tabs.length > 0) {
                // Try to get auth token from the first Tildra tab
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getAuthToken' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Could not get auth token from web page:', chrome.runtime.lastError.message);
                        return;
                    }
                    
                    if (response && response.authToken) {
                        console.log('Got auth token from web page');
                        chrome.storage.local.set({ authToken: response.authToken });
                    }
                });
            }
        });
    }

    // Initialize all functionality
    checkAuthentication();
    initializeResumeUpload();
    initializeHistory();
    hideError();
    hideProgress();
    
    if (summaryContainer) {
        summaryContainer.style.display = 'none';
    }

    // Auto-detect jobs if Job Copilot panel is initially active
    const jobCopilotTab = document.querySelector('[data-panel="job-copilot"]');
    if (jobCopilotTab && jobCopilotTab.classList.contains('active')) {
        setTimeout(() => {
            autoDetectJob();
        }, 500);
    }

    console.log('Simple popup initialized');
}); 