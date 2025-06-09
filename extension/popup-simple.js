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

    // MODERN ROBUST JOB DETECTION - Works on all pages including local files
    async function autoDetectJob() {
        const jobStatus = document.getElementById('job-copilot-status');
        const statusTitle = jobStatus?.querySelector('.status-title');
        const statusMessage = jobStatus?.querySelector('.status-message');

        function updateJobStatus(title, message, isSuccess = false) {
            if (statusTitle) statusTitle.textContent = title;
            if (statusMessage) statusMessage.textContent = message;
        }

        try {
            updateJobStatus('🔍 Auto-scanning Page', 'Analyzing page content...');

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

            // Use modern chrome.scripting API to directly analyze page content
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: analyzePageForJob
            });

            if (results && results[0] && results[0].result) {
                const jobDetails = results[0].result;
                if (jobDetails.isJobPage) {
                    console.log('🎯 Job detected:', jobDetails);
                    updateJobStatus('✅ Job Detected!', 'Found job posting on this page', true);
                    
                    // Show job badge
                    const badge = document.getElementById('job-copilot-badge');
                    if (badge) badge.style.display = 'inline-block';
                    
                    // Display job details
                    displayJobDetails(jobDetails);
                    
                    // Store in background for future reference
                    chrome.runtime.sendMessage({
                        type: 'JOB_PAGE_DETECTED',
                        data: jobDetails
                    });
                    
                    // Enable resume tailoring if resume is uploaded
                    setTimeout(() => enableResumeTailoring(), 1000);
                } else {
                    updateJobStatus('🔍 Ready to Scan', 'Click "Scan for Jobs" if you\'re on a job page');
                }
            } else {
                updateJobStatus('🔍 Ready to Scan', 'Click "Scan for Jobs" to detect job postings');
            }

        } catch (error) {
            console.error('Auto job detection error:', error);
            updateJobStatus('🔍 Ready to Scan', 'Click "Scan for Jobs" to detect job postings');
        }
    }

    // MODERN ROBUST MANUAL JOB DETECTION
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
            updateJobStatus('🔍 Scanning Page', 'Analyzing page content...');

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

            // Use modern chrome.scripting API to directly analyze page content
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: analyzePageForJob
            });

            if (results && results[0] && results[0].result) {
                const jobDetails = results[0].result;
                if (jobDetails.isJobPage) {
                    console.log('🎯 Job detected:', jobDetails);
                    updateJobStatus('✅ Job Detected!', 'Found job posting on this page', true);
                    showStatus('✅ Job detected! Review details below.', false);
                    
                    // Show job badge
                    const badge = document.getElementById('job-copilot-badge');
                    if (badge) badge.style.display = 'inline-block';
                    
                    // Display job details
                    displayJobDetails(jobDetails);
                    
                    // Store in background for future reference
                    chrome.runtime.sendMessage({
                        type: 'JOB_PAGE_DETECTED',
                        data: jobDetails
                    });
                    
                    // Enable resume tailoring if resume is uploaded
                    setTimeout(() => enableResumeTailoring(), 1000);
                } else {
                    updateJobStatus('❌ No Job Found', 'This page doesn\'t appear to contain a job posting');
                    showStatus('❌ No job posting found on this page', true);
                }
            } else {
                updateJobStatus('❌ Detection Failed', 'Could not analyze page content');
                showStatus('❌ Job scanning failed: Could not analyze page', true);
            }
            
            setTimeout(hideError, 5000);
            setButtonState(jobBtn, false);

        } catch (error) {
            console.error('Job detection error:', error);
            updateJobStatus('❌ Error', error.message);
            showStatus(`❌ Job scanning failed: ${error.message}`, true);
            setButtonState(jobBtn, false);
        }
    }

    // INJECTED FUNCTION - This runs directly in the page context
    function analyzePageForJob() {
        console.log('🔍 [Job Detection] Starting page analysis...');
        
        // Get page content for analysis
        const pageTitle = document.title.toLowerCase();
        const pageUrl = window.location.href.toLowerCase();
        const pageText = document.body ? document.body.innerText.toLowerCase() : '';
        const metaDescription = document.querySelector('meta[name="description"]')?.content?.toLowerCase() || '';
        
        console.log('📄 Page info:', { title: pageTitle, url: pageUrl });
        
        // Enhanced scoring system
        let score = 0;
        const reasons = [];
        
        // URL indicators (2 points each)
        const urlIndicators = [
            'job', 'career', 'position', 'opening', 'vacancy', 'hiring', 
            'apply', 'employment', 'work', 'recruit'
        ];
        
        for (const indicator of urlIndicators) {
            if (pageUrl.includes(indicator)) {
                score += 2;
                reasons.push(`URL contains "${indicator}"`);
            }
        }
        
        // Title indicators (3 points each)
        const titleIndicators = [
            'engineer', 'developer', 'manager', 'analyst', 'designer', 
            'director', 'specialist', 'coordinator', 'consultant', 
            'architect', 'lead', 'senior', 'junior', 'intern', 'job',
            'position', 'role', 'career', 'opening'
        ];
        
        for (const indicator of titleIndicators) {
            if (pageTitle.includes(indicator)) {
                score += 3;
                reasons.push(`Title contains "${indicator}"`);
            }
        }
        
        // Content indicators (1 point each)
        const contentIndicators = [
            'responsibilities', 'requirements', 'qualifications', 'experience',
            'apply now', 'submit application', 'salary', 'benefits',
            'skills required', 'job description', 'about the role',
            'what you\'ll do', 'we are looking for', 'join our team'
        ];
        
        for (const indicator of contentIndicators) {
            if (pageText.includes(indicator) || metaDescription.includes(indicator)) {
                score += 1;
                reasons.push(`Content contains "${indicator}"`);
                break; // Only count once per category
            }
        }
        
        // Platform-specific bonus points
        const jobPlatforms = [
            'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com',
            'ziprecruiter.com', 'greenhouse.io', 'lever.co', 'workday.com',
            'smartrecruiters.com', 'icims.com', 'ashbyhq.com', 'bamboohr.com'
        ];
        
        for (const platform of jobPlatforms) {
            if (pageUrl.includes(platform)) {
                score += 5;
                reasons.push(`Known job platform: ${platform}`);
                break;
            }
        }
        
        console.log('📊 Job detection score:', score, 'Reasons:', reasons);
        
        // Determine if this is a job page (threshold: 3 points)
        const isJobPage = score >= 3;
        
        if (!isJobPage) {
            console.log('❌ Not a job page (score too low)');
            return { isJobPage: false, score, reasons };
        }
        
        console.log('✅ Job page detected! Extracting details...');
        
        // Extract job details
        let jobTitle = 'Unknown Position';
        let companyName = 'Unknown Company';
        let jobDescription = 'No description available';
        let location = '';
        let salary = '';
        
        // Extract job title
        const titleSelectors = [
            'h1[data-automation="job-title"]', // Common job sites
            'h1.job-title',
            'h1[class*="title"]',
            '.job-header h1',
            '.job-title h1',
            'h1[class*="job"]',
            'h1[id*="job"]',
            'h1'
        ];
        
        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                jobTitle = element.textContent.trim();
                console.log('📋 Found job title:', jobTitle);
                break;
            }
        }
        
        // If no good title found, try parsing from page title
        if (jobTitle === 'Unknown Position' && pageTitle) {
            // Try to extract job title from page title (before company name or "at")
            const titleParts = pageTitle.split(/\s+[-|at]\s+/);
            if (titleParts.length > 1) {
                jobTitle = titleParts[0].trim();
            } else {
                jobTitle = pageTitle.replace(/\s*\|\s*.*$/, '').trim(); // Remove everything after |
            }
        }
        
        // Extract company name
        const companySelectors = [
            '[data-automation="company-name"]',
            '.company-name',
            '.employer-name',
            'a[data-cy="company-link"]',
            '.job-company',
            '[class*="company"]',
            'span[title*="company"]'
        ];
        
        for (const selector of companySelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                companyName = element.textContent.trim();
                console.log('🏢 Found company name:', companyName);
                break;
            }
        }
        
        // Try to extract company from page title if not found
        if (companyName === 'Unknown Company' && pageTitle) {
            const titleParts = pageTitle.split(/\s+[-|at]\s+/);
            if (titleParts.length > 1) {
                companyName = titleParts[1].replace(/\s*\|.*$/, '').trim();
            }
        }
        
        // Extract job description (more robust)
        const descSelectors = [
            '[data-automation="job-description"]',
            '.job-description',
            '.job-details',
            '#job-description',
            '.description',
            '[class*="description"]',
            '.content',
            '[role="main"]',
            '.job-posting-content',
            '.job-body',
            '.posting-description',
            'main',
            'article'
        ];
        
        let bestDescription = '';
        let bestScore = 0;
        
        for (const selector of descSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 50) {
                const text = element.textContent.trim();
                const score = text.length; // Longer is usually better for job descriptions
                
                if (score > bestScore && score > 100) {
                    bestDescription = text.substring(0, 3000); // Increased limit
                    bestScore = score;
                }
            }
        }
        
        // If no good description found, try to extract from page text
        if (!bestDescription && pageText.length > 200) {
            // Look for common job description patterns
            const jobSections = pageText.match(/(responsibilities|requirements|qualifications|about the role|job description|what you'll do)[\s\S]{100,1500}/i);
            if (jobSections) {
                bestDescription = jobSections[0].substring(0, 2000);
            } else {
                // Fallback: take a meaningful chunk of page text
                const sentences = pageText.split(/[.!?]+/);
                const relevantSentences = sentences.filter(s => 
                    s.length > 20 && 
                    (s.includes('experience') || s.includes('skill') || s.includes('responsibl') || s.includes('requir'))
                ).slice(0, 10);
                
                if (relevantSentences.length > 0) {
                    bestDescription = relevantSentences.join('. ').trim().substring(0, 2000);
                }
            }
        }
        
        jobDescription = bestDescription || 'No description available';
        console.log('📝 Found job description (length):', jobDescription.length);
        
        // Extract location
        const locationSelectors = [
            '[data-automation="job-location"]',
            '.job-location',
            '.location',
            '[class*="location"]'
        ];
        
        for (const selector of locationSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                location = element.textContent.trim();
                break;
            }
        }
        
        // Extract salary
        const salarySelectors = [
            '[data-automation="salary"]',
            '.salary',
            '.compensation',
            '[class*="salary"]',
            '[class*="pay"]'
        ];
        
        for (const selector of salarySelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                salary = element.textContent.trim();
                break;
            }
        }
        
        const result = {
            isJobPage: true,
            score,
            reasons,
            title: jobTitle,
            company: companyName,
            description: jobDescription,
            location,
            salary,
            url: window.location.href,
            detectedAt: new Date().toISOString()
        };
        
        console.log('🎯 Final job details:', result);
        return result;
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
                const maxSize = 10 * 1024 * 1024; // 10MB (increased for LaTeX files)
                const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.tex', '.latex'];
                const fileExt = '.' + file.name.split('.').pop().toLowerCase();

                if (file.size > maxSize) {
                    uploadStatus.textContent = '❌ File too large. Max size is 10MB.';
                    uploadStatus.style.color = '#e74c3c';
                    confirmBtn.disabled = true;
                    return;
                }

                if (!allowedTypes.includes(fileExt)) {
                    uploadStatus.textContent = '❌ Invalid file type. Use PDF, DOC, DOCX, TXT, TEX, or LATEX.';
                    uploadStatus.style.color = '#e74c3c';
                    confirmBtn.disabled = true;
                    return;
                }

                fileLabel.textContent = file.name;
                
                // Show different message for LaTeX files
                if (fileExt === '.tex' || fileExt === '.latex') {
                    uploadStatus.textContent = `✅ ${file.name} ready to upload (LaTeX detected)`;
                } else {
                    uploadStatus.textContent = `✅ ${file.name} ready to upload`;
                }
                uploadStatus.style.color = '#27ae60';
                confirmBtn.disabled = false;
            }
        });

        // Handle upload confirmation
        confirmBtn?.addEventListener('click', async (e) => {
            // Prevent any form submission or default behavior
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const file = fileInput.files[0];
            if (!file) return;

            // Disable the button to prevent double-clicks
            confirmBtn.disabled = true;
            setButtonState(confirmBtn, true, 'Processing...');
            uploadStatus.textContent = '📤 Processing resume...';
            uploadStatus.style.color = '#3498db';

            try {
                // Read file content based on file type
                const fileExt = '.' + file.name.split('.').pop().toLowerCase();
                let fileContent = '';
                
                if (fileExt === '.pdf') {
                    uploadStatus.textContent = '📤 Processing PDF resume...';
                    // For PDF files, we'll need to extract text - for now, store as binary
                    const arrayBuffer = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsArrayBuffer(file);
                    });
                    fileContent = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                } else {
                    uploadStatus.textContent = '📤 Processing text resume...';
                    // For text-based files (including LaTeX)
                    fileContent = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsText(file);
                    });
                }
                
                // Parse resume content for key information
                uploadStatus.textContent = '🔍 Analyzing resume content...';
                const parsedResume = parseResumeContent(fileContent, fileExt);
                
                uploadStatus.textContent = '✅ Resume processed successfully!';
                uploadStatus.style.color = '#27ae60';
                
                // Store comprehensive resume data
                const resumeData = {
                    fileName: file.name,
                    uploadDate: new Date().toISOString(),
                    size: file.size,
                    content: fileContent,
                    type: file.type || 'text/plain',
                    fileExt: fileExt,
                    isLatex: fileExt === '.tex' || fileExt === '.latex',
                    isPdf: fileExt === '.pdf',
                    parsed: parsedResume
                };

                // Store the resume data first
                await new Promise((resolve) => {
                    chrome.storage.local.set({ resumeData }, resolve);
                });
                
                // Update UI to show success
                showStatus('✅ Resume uploaded and ready for tailoring!');
                
                // Update upload button text to show resume is ready
                if (uploadBtn) {
                    const icon = fileExt === '.tex' || fileExt === '.latex' ? '📄' : 
                                fileExt === '.pdf' ? '📋' : '📝';
                    uploadBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <span>${icon} ${file.name}</span>
                    `;
                }
                
                // Enable resume tailoring
                enableResumeTailoring();
                
                // Close dialog after a brief delay to show success
                setTimeout(() => {
                    hideDialog();
                }, 2000);

            } catch (error) {
                console.error('Resume upload error:', error);
                uploadStatus.textContent = '❌ Processing failed. Please try again.';
                uploadStatus.style.color = '#e74c3c';
                confirmBtn.disabled = false;
                setButtonState(confirmBtn, false, '📤 Upload and Analyze');
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
    initializeTemplateSelection();
    initializeEnhancedJobActions();
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

    // RESUME PARSING AND ANALYSIS
    function parseResumeContent(content, fileExt) {
        if (fileExt === '.pdf') {
            // PDF content is base64 encoded, we'll need better extraction later
            return {
                type: 'pdf',
                extracted: false,
                message: 'PDF parsing requires additional processing'
            };
        }
        
        const text = content.toLowerCase();
        const originalText = content;
        
        // Extract key sections using regex patterns
        const sections = {
            contact: extractContactInfo(originalText),
            experience: extractExperience(originalText),
            education: extractEducation(originalText),
            skills: extractSkills(originalText),
            projects: extractProjects(originalText),
            summary: extractSummary(originalText)
        };
        
        // Extract keywords for matching
        const keywords = extractKeywords(text);
        
        return {
            type: fileExt,
            isLatex: fileExt === '.tex' || fileExt === '.latex',
            sections,
            keywords,
            wordCount: text.split(/\s+/).length,
            lastParsed: new Date().toISOString()
        };
    }
    
    function extractContactInfo(text) {
        const email = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        const phone = text.match(/[\(\)0-9\-\+\s]{10,}/);
        const linkedin = text.match(/linkedin\.com\/[\w\/-]+/i);
        const github = text.match(/github\.com\/[\w\/-]+/i);
        
        return {
            email: email ? email[0] : null,
            phone: phone ? phone[0].trim() : null,
            linkedin: linkedin ? linkedin[0] : null,
            github: github ? github[0] : null
        };
    }
    
    function extractExperience(text) {
        // Look for experience/work section
        const expSection = text.match(/(experience|employment|work history)[\s\S]*?(?=\n\s*[A-Z]{2,}|\n\s*education|\n\s*skills|$)/i);
        if (!expSection) return [];
        
        // Extract company names and roles (simplified)
        const companies = expSection[0].match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+Inc\.?|\s+LLC|\s+Corp\.?|\s+Ltd\.?)?\b/g) || [];
        const roles = expSection[0].match(/\b(?:Senior|Junior|Lead|Principal)?\s*(?:Software\s+)?(?:Engineer|Developer|Manager|Analyst|Designer|Architect|Specialist)\b/gi) || [];
        
        return {
            companies: companies.slice(0, 5), // Limit to prevent noise
            roles: roles.slice(0, 5),
            rawSection: expSection[0].substring(0, 500)
        };
    }
    
    function extractEducation(text) {
        const eduSection = text.match(/(education|academic)[\s\S]*?(?=\n\s*[A-Z]{2,}|\n\s*experience|\n\s*skills|$)/i);
        if (!eduSection) return {};
        
        const degrees = eduSection[0].match(/\b(?:Bachelor|Master|PhD|B\.S\.|M\.S\.|B\.A\.|M\.A\.)[\s\w]*?\b/gi) || [];
        const schools = eduSection[0].match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:University|College|Institute|School)\b/g) || [];
        
        return {
            degrees: degrees.slice(0, 3),
            schools: schools.slice(0, 3),
            rawSection: eduSection[0].substring(0, 300)
        };
    }
    
    function extractSkills(text) {
        const skillsSection = text.match(/(skills|technologies|technical skills)[\s\S]*?(?=\n\s*[A-Z]{2,}|\n\s*experience|\n\s*education|$)/i);
        
        // Common technical skills patterns
        const programmingLanguages = text.match(/\b(JavaScript|Python|Java|C\+\+|C#|Ruby|Go|Rust|Swift|Kotlin|TypeScript|PHP|Scala|R|MATLAB)\b/gi) || [];
        const frameworks = text.match(/\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|Laravel|\\.NET|Rails)\b/gi) || [];
        const databases = text.match(/\b(MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|Cassandra|Oracle|SQL Server)\b/gi) || [];
        const tools = text.match(/\b(Git|Docker|Kubernetes|AWS|Azure|GCP|Jenkins|Terraform|Ansible)\b/gi) || [];
        
        return {
            programming: [...new Set(programmingLanguages)],
            frameworks: [...new Set(frameworks)],
            databases: [...new Set(databases)],
            tools: [...new Set(tools)],
            rawSection: skillsSection ? skillsSection[0].substring(0, 500) : ''
        };
    }
    
    function extractProjects(text) {
        const projectSection = text.match(/(projects|portfolio)[\s\S]*?(?=\n\s*[A-Z]{2,}|\n\s*experience|\n\s*education|$)/i);
        if (!projectSection) return [];
        
        const projectNames = projectSection[0].match(/\b[A-Z][a-zA-Z\s]+(?=\s*[-:])/g) || [];
        return {
            projects: projectNames.slice(0, 5),
            rawSection: projectSection[0].substring(0, 500)
        };
    }
    
    function extractSummary(text) {
        const summarySection = text.match(/(summary|objective|profile)[\s\S]*?(?=\n\s*[A-Z]{2,}|\n\s*experience|\n\s*education|$)/i);
        return summarySection ? summarySection[0].substring(0, 300) : '';
    }
    
    function extractKeywords(text) {
        // Extract relevant keywords for job matching
        const techKeywords = text.match(/\b(agile|scrum|devops|ci\/cd|microservices|rest api|graphql|machine learning|ai|blockchain|cloud|mobile|web|backend|frontend|fullstack|data|analytics|security)\b/gi) || [];
        const industryKeywords = text.match(/\b(fintech|healthcare|e-commerce|startup|enterprise|saas|b2b|b2c|mobile app|web app)\b/gi) || [];
        
        return [...new Set([...techKeywords, ...industryKeywords])];
    }
    
    // TEMPLATE SELECTION FUNCTIONALITY
    function initializeTemplateSelection() {
        const selectTemplateBtn = document.getElementById('select-template');
        const templateDialog = document.getElementById('template-selection-dialog');
        const templateCancel = document.getElementById('template-cancel');
        const templateOptions = document.querySelectorAll('.select-template-btn');

        if (!selectTemplateBtn || !templateDialog) return;

        // Show template selection dialog
        selectTemplateBtn.addEventListener('click', () => {
            templateDialog.style.display = 'flex';
        });

        // Hide template dialog
        function hideTemplateDialog() {
            templateDialog.style.display = 'none';
        }

        templateCancel?.addEventListener('click', hideTemplateDialog);

        // Handle template selection
        templateOptions.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const templateType = e.target.dataset.template;
                await createResumeFromTemplate(templateType);
                hideTemplateDialog();
            });
        });

        // Click outside to close
        templateDialog?.addEventListener('click', (e) => {
            if (e.target === templateDialog) {
                hideTemplateDialog();
            }
        });
    }

    async function createResumeFromTemplate(templateType) {
        try {
            showStatus('🔨 Creating resume from template...', false);
            
            // Load the LaTeX template
            const templateContent = await loadLatexTemplate();
            
            // Create resume data with template
            const resumeData = {
                fileName: `resume_${templateType}_${Date.now()}.tex`,
                uploadDate: new Date().toISOString(),
                content: templateContent,
                type: 'text/plain',
                fileExt: '.tex',
                isLatex: true,
                fromTemplate: true,
                templateType: templateType,
                parsed: {
                    type: '.tex',
                    isLatex: true,
                    sections: {
                        contact: { placeholder: true },
                        experience: { placeholder: true },
                        education: { placeholder: true },
                        skills: { placeholder: true },
                        projects: { placeholder: true }
                    },
                    keywords: [],
                    wordCount: templateContent.split(/\s+/).length
                }
            };

            // Store template resume
            chrome.storage.local.set({ resumeData }, () => {
                showStatus('✅ Template resume created! Fill in your details and tailor to jobs.', false);
                
                // Update upload button
                const uploadBtn = document.getElementById('upload-resume');
                if (uploadBtn) {
                    uploadBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <span>📄 ${resumeData.fileName}</span>
                    `;
                }
                
                enableResumeTailoring();
                setTimeout(hideError, 3000);
            });

        } catch (error) {
            console.error('Template creation error:', error);
            showStatus('❌ Failed to create template. Please try again.', true);
        }
    }

    async function loadLatexTemplate() {
        // Return the LaTeX template content
        return `%------------------------
% Professional Resume Template
%------------------------
\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\usepackage{ragged2e}
\\usepackage{etoolbox}
\\usepackage{tikz}
\\input{glyphtounicode}

% font options
\\usepackage{times}
\\usepackage[T1]{fontenc}

\\pagestyle{fancy}
\\fancyhf{}  % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.75in}
\\addtolength{\\textheight}{1.2in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\setlength{\\footskip}{5pt}

% sections formatting
\\titleformat{\\section}{
\\vspace{-2pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule\\vspace{-5pt}]

% ensure that generated pdf is machine readable/ATS parsable
\\pdfgentounicode=1

% custom commands
\\newcommand{\\cvitem}[1]{
\\item\\small{
{#1\\vspace{-2pt}}
}
}

\\newcommand{\\cvheading}[4]{
\\vspace{-2pt}\\item
\\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
\\textbf{#1} & #2 \\\\
\\small#3 & \\small #4 \\\\
\\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\cvheadingstart}{\\begin{itemize}[leftmargin=0in, label={}]}
\\newcommand{\\cvheadingend}{\\end{itemize}}
\\newcommand{\\cvitemstart}{\\begin{itemize}[label=\\textopenbullet]\\justifying}
\\newcommand{\\cvitemend}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

% contact information
\\begin{center}
\\textbf{\\LARGE\\scshape [YOUR NAME]} \\\\
\\vspace{1pt}\\small
[PHONE NUMBER] $\\ \\diamond\\ $ \\href{mailto:[EMAIL]}{[EMAIL]} $\\ \\diamond\\ $
\\href{[WEBSITE]}{[WEBSITE]} $\\ \\diamond\\ $
\\href{[LINKEDIN]}{[LINKEDIN]}
\\end{center}

\\section{Education}
\\cvheadingstart
\\cvheading{[UNIVERSITY NAME]}{[LOCATION]}{[DEGREE]}{[GRADUATION DATE]}
\\cvitemstart
\\cvitem{[EDUCATION DETAILS]}
\\cvitemend
\\cvheadingend

\\section{Professional Experience}
\\cvheadingstart
\\cvheading{[COMPANY NAME]}{[LOCATION]}{[POSITION TITLE]}{[DATES]}
\\cvitemstart
\\cvitem{[ACHIEVEMENT OR RESPONSIBILITY]}
\\cvitem{[ACHIEVEMENT OR RESPONSIBILITY]}
\\cvitem{[ACHIEVEMENT OR RESPONSIBILITY]}
\\cvitem{[ACHIEVEMENT OR RESPONSIBILITY]}
\\cvitemend
\\cvheadingend

\\section{Projects}
\\cvheadingstart
\\cvheading{[PROJECT NAME]}{[ORGANIZATION]}{[TECHNOLOGIES]}{[DATE]}
\\cvitemstart
\\cvitem{[PROJECT DESCRIPTION]}
\\cvitem{[KEY ACHIEVEMENT]}
\\cvitem{[TECHNICAL IMPLEMENTATION]}
\\cvitemend
\\cvheadingend

\\section{Technical Skills}
\\cvheadingstart
\\item
\\cvitemstart
\\cvitem{\\textbf{Languages:} [PROGRAMMING LANGUAGES]}
\\cvitem{\\textbf{Frameworks:} [FRAMEWORKS AND LIBRARIES]}
\\cvitem{\\textbf{Tools:} [TOOLS AND PLATFORMS]}
\\cvitemend
\\cvheadingend

\\end{document}`;
    }

    // ENHANCED JOB ACTIONS
    function initializeEnhancedJobActions() {
        // Re-bind the enhanced action buttons
        const manualJobDetect = document.getElementById('manual-job-detect');
        const uploadResume = document.getElementById('upload-resume');
        const selectTemplate = document.getElementById('select-template');

        // Enhanced manual job detection
        manualJobDetect?.addEventListener('click', async () => {
            setButtonState(manualJobDetect, true, '🔍 Scanning...');
            await detectJob();
            setButtonState(manualJobDetect, false, '🔍 Scan for Jobs');
        });

        // Check for existing resume to update upload button
        chrome.storage.local.get(['resumeData'], (result) => {
            if (result.resumeData && uploadResume) {
                const icon = result.resumeData.isLatex ? '📄' : 
                           result.resumeData.isPdf ? '📋' : '📝';
                uploadResume.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <span>${icon} ${result.resumeData.fileName}</span>
                `;
            }
        });
    }

    // RESUME TAILORING FUNCTIONALITY WITH AI
    function enableResumeTailoring() {
        // Check if we have both resume and job details
        chrome.storage.local.get(['resumeData'], (result) => {
            if (result.resumeData) {
                // Get current tab to check for job details
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.runtime.sendMessage({ action: 'getJobDetails', tabId: tabs[0].id }, (response) => {
                            if (response && response.success && response.jobDetails) {
                                showTailoringOptions(result.resumeData, response.jobDetails);
                            }
                        });
                    }
                });
            }
        });
    }
    
    function showTailoringOptions(resumeData, jobDetails) {
        // Add tailoring button to the job copilot interface
        const jobContainer = document.querySelector('.job-details');
        if (!jobContainer) return;
        
        // Check if tailoring button already exists
        if (document.getElementById('resume-tailor-btn')) return;
        
        const tailorButton = document.createElement('button');
        tailorButton.id = 'resume-tailor-btn';
        tailorButton.className = 'action-button tailoring-button';
        tailorButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            🎯 Tailor Resume for This Job
        `;
        
        tailorButton.addEventListener('click', () => {
            tailorResumeForJob(resumeData, jobDetails);
        });
        
        // Insert after the job details
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'tailoring-container';
        buttonContainer.appendChild(tailorButton);
        jobContainer.appendChild(buttonContainer);
    }
    
    async function tailorResumeForJob(resumeData, jobDetails) {
        try {
            showStatus('🎯 AI is tailoring your resume...', false);
            
            // Analyze job requirements
            const jobAnalysis = analyzeJobRequirements(jobDetails);
            
            // Analyze current resume
            const resumeAnalysis = {
                skills: resumeData.parsed.skills || {},
                experience: resumeData.parsed.experience || {},
                keywords: resumeData.parsed.keywords || [],
                isLatex: resumeData.isLatex
            };
            
            // Call AI API for advanced resume tailoring
            const aiTailoredContent = await callAITailoringAPI(resumeData, jobDetails, jobAnalysis);
            
            if (aiTailoredContent) {
                // Use AI-generated content
                showStatus('✅ AI has tailored your resume!', false);
                await injectTailoredResumeIntoPage(aiTailoredContent, jobDetails, 'ai-tailored');
            } else {
                // Fallback to rule-based tailoring
                showStatus('🔧 Applying rule-based tailoring...', false);
                const suggestions = generateTailoringSuggestions(resumeAnalysis, jobAnalysis);
                const tailoredContent = generateTailoredResume(resumeData, suggestions, jobDetails);
                await injectTailoredResumeIntoPage(tailoredContent, jobDetails, 'rule-based');
            }
            
            // Store tailoring session
            const tailoringSession = {
                timestamp: new Date().toISOString(),
                jobTitle: jobDetails.title,
                company: jobDetails.company,
                resumeFile: resumeData.fileName,
                method: aiTailoredContent ? 'ai-tailored' : 'rule-based'
            };
            
            chrome.storage.local.get(['tailoringSessions'], (result) => {
                const sessions = result.tailoringSessions || [];
                sessions.unshift(tailoringSession);
                chrome.storage.local.set({ tailoringSessions: sessions.slice(0, 10) }); // Keep last 10
            });
            
            setTimeout(hideError, 4000);
            
        } catch (error) {
            console.error('Resume tailoring error:', error);
            showStatus('❌ Tailoring failed. Using basic suggestions.', true);
            
            // Fallback to basic tailoring
            try {
                const jobAnalysis = analyzeJobRequirements(jobDetails);
                const resumeAnalysis = { skills: resumeData.parsed.skills || {}, keywords: resumeData.parsed.keywords || [] };
                const suggestions = generateTailoringSuggestions(resumeAnalysis, jobAnalysis);
                const tailoredContent = generateTailoredResume(resumeData, suggestions, jobDetails);
                await injectTailoredResumeIntoPage(tailoredContent, jobDetails, 'fallback');
            } catch (fallbackError) {
                console.error('Fallback tailoring failed:', fallbackError);
                showStatus('❌ Unable to tailor resume. Please try again.', true);
            }
        }
    }

    // NEW: AI API Integration for Resume Tailoring
    async function callAITailoringAPI(resumeData, jobDetails, jobAnalysis) {
        try {
            // Get auth token
            const authResult = await new Promise((resolve) => {
                chrome.storage.local.get(['authToken', 'clerkUserId'], resolve);
            });
            
            if (!authResult.clerkUserId) {
                console.log('No auth token available for AI tailoring');
                return null;
            }
            
            const requestPayload = {
                resume: {
                    content: resumeData.content,
                    isLatex: resumeData.isLatex,
                    fileName: resumeData.fileName,
                    parsed: resumeData.parsed
                },
                job: {
                    title: jobDetails.title,
                    company: jobDetails.company,
                    description: jobDetails.description,
                    requirements: jobDetails.requirements || [],
                    location: jobDetails.location
                },
                analysis: jobAnalysis,
                tailoringType: resumeData.isLatex ? 'latex' : 'text',
                preserveStructure: true, // Important: Only change content, not LaTeX structure
                userId: authResult.clerkUserId
            };
            
            console.log('🤖 Calling AI tailoring API...');
            
            const response = await fetch('https://api.tildra.xyz/api/tailor-resume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authResult.authToken || 'demo-token'}`,
                    'X-User-ID': authResult.clerkUserId
                },
                body: JSON.stringify(requestPayload)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ AI tailoring successful');
                
                return {
                    content: result.tailoredContent,
                    suggestions: result.suggestions || [],
                    matchScore: result.matchScore || 0,
                    improvedSkills: result.improvedSkills || [],
                    missingSkills: result.missingSkills || [],
                    type: 'ai-generated'
                };
            } else {
                console.log('AI API responded with error:', response.status);
                return null;
            }
            
        } catch (error) {
            console.error('AI tailoring API error:', error);
            return null;
        }
    }
    
    function analyzeJobRequirements(jobDetails) {
        const description = jobDetails.description.toLowerCase();
        
        // Extract required skills
        const skillsMatch = description.match(/(skills|requirements|qualifications|technologies)[^.]*?([^.]{100,500})/i);
        const skillsText = skillsMatch ? skillsMatch[2] : description.substring(0, 500);
        
        // Extract tech stack
        const techStack = {
            languages: extractTechFromText(skillsText, ['javascript', 'python', 'java', 'react', 'node', 'typescript']),
            frameworks: extractTechFromText(skillsText, ['react', 'angular', 'vue', 'express', 'django', 'spring']),
            databases: extractTechFromText(skillsText, ['sql', 'mongodb', 'postgresql', 'mysql', 'redis']),
            cloud: extractTechFromText(skillsText, ['aws', 'azure', 'gcp', 'docker', 'kubernetes']),
            tools: extractTechFromText(skillsText, ['git', 'jenkins', 'jira', 'confluence', 'figma'])
        };
        
        // Extract experience level
        const experienceMatch = description.match(/(\d+)[+\-\s]*years?\s+(?:of\s+)?experience/i);
        const experienceLevel = experienceMatch ? parseInt(experienceMatch[1]) : 0;
        
        // Extract key responsibilities
        const responsibilities = description.match(/(responsibilities|duties|you will)[^.]*?([^.]{200,800})/i);
        const keyResponsibilities = responsibilities ? responsibilities[2] : '';
        
        return {
            techStack,
            experienceLevel,
            keyResponsibilities,
            companyName: jobDetails.company,
            jobTitle: jobDetails.title,
            fullDescription: description
        };
    }
    
    function extractTechFromText(text, keywords) {
        return keywords.filter(keyword => 
            text.includes(keyword.toLowerCase())
        );
    }
    
    function generateTailoringSuggestions(resumeAnalysis, jobAnalysis) {
        const suggestions = {
            skillsToHighlight: [],
            missingSkills: [],
            experienceAlignment: '',
            keywordMatches: [],
            recommendedChanges: []
        };
        
        // Find skill matches and gaps
        const resumeSkills = [
            ...resumeAnalysis.skills.programming || [],
            ...resumeAnalysis.skills.frameworks || [],
            ...resumeAnalysis.skills.databases || [],
            ...resumeAnalysis.skills.tools || []
        ].map(s => s.toLowerCase());
        
        const jobSkills = [
            ...jobAnalysis.techStack.languages,
            ...jobAnalysis.techStack.frameworks,
            ...jobAnalysis.techStack.databases,
            ...jobAnalysis.techStack.cloud,
            ...jobAnalysis.techStack.tools
        ];
        
        suggestions.skillsToHighlight = jobSkills.filter(skill => 
            resumeSkills.some(rSkill => rSkill.includes(skill.toLowerCase()))
        );
        
        suggestions.missingSkills = jobSkills.filter(skill => 
            !resumeSkills.some(rSkill => rSkill.includes(skill.toLowerCase()))
        );
        
        // Generate recommended changes
        if (suggestions.skillsToHighlight.length > 0) {
            suggestions.recommendedChanges.push(`Emphasize these matching skills: ${suggestions.skillsToHighlight.join(', ')}`);
        }
        
        if (suggestions.missingSkills.length > 0) {
            suggestions.recommendedChanges.push(`Consider adding these skills if you have them: ${suggestions.missingSkills.join(', ')}`);
        }
        
        return suggestions;
    }
    
    function generateLatexModifications(latexContent, suggestions) {
        let modifiedContent = latexContent;
        
        // Add comments with tailoring suggestions
        const suggestionComments = suggestions.recommendedChanges.map(change => 
            `% TAILORING SUGGESTION: ${change}`
        ).join('\n');
        
        // Insert suggestions at the top
        modifiedContent = suggestionComments + '\n\n' + modifiedContent;
        
        return {
            content: modifiedContent,
            suggestions: suggestions,
            type: 'latex'
        };
    }
    
    function generateTailoredResume(resumeData, suggestions, jobDetails) {
        return {
            content: resumeData.content,
            suggestions: suggestions,
            jobDetails: jobDetails,
            type: 'tailored_text'
        };
    }
    
    async function injectTailoredResumeIntoPage(tailoredContent, jobDetails, type) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Enhanced content object for injection
            const enhancedContent = {
                ...tailoredContent,
                jobTitle: jobDetails.title,
                company: jobDetails.company,
                type: type,
                isAiGenerated: type === 'ai-tailored',
                timestamp: new Date().toISOString()
            };
            
            // Pass the content to the content script to display in the page
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: injectEnhancedResumeOverlay,
                args: [enhancedContent]
            });
            
            console.log('✅ Enhanced tailored resume injected into page');
            
        } catch (error) {
            console.error('Failed to inject tailored resume:', error);
            
            // Fallback: show in extension popup
            displayTailoredResumeInPopup(tailoredContent, jobDetails, type);
        }
    }
    
    function injectEnhancedResumeOverlay(enhancedContent) {
        // Remove any existing overlay
        const existingOverlay = document.getElementById('tildra-tailoring-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Remove existing styles
        const existingStyles = document.getElementById('tildra-overlay-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        const isAiGenerated = enhancedContent.isAiGenerated;
        const matchScore = enhancedContent.matchScore || 0;
        
        // Create comprehensive styles
        const styles = document.createElement('style');
        styles.id = 'tildra-overlay-styles';
        styles.textContent = `
            #tildra-tailoring-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: overlayFadeIn 0.3s ease-out;
            }
            
            @keyframes overlayFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .tildra-overlay-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
            }
            
            .tildra-overlay-container {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                background: linear-gradient(135deg, #0f0f17 0%, #1a1a2e 100%);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.12);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .tildra-overlay-header {
                padding: 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            }
            
            .title-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }
            
            .title-icon {
                font-size: 24px;
            }
            
            .tildra-overlay-header h2 {
                color: #ffffff;
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                flex: 1;
            }
            
            .tildra-close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #ffffff;
                border-radius: 8px;
                width: 32px;
                height: 32px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .subtitle-row {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            
            .company-name {
                color: #a0a0b0;
                font-weight: 500;
            }
            
            .method-badge {
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .method-badge.ai-enhanced {
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
                color: #a78bfa;
                border: 1px solid rgba(139, 92, 246, 0.3);
            }
            
            .method-badge.rule-based {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%);
                color: #34d399;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            
            .match-score {
                padding: 4px 8px;
                background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(251, 146, 60, 0.2) 100%);
                color: #fb923c;
                border: 1px solid rgba(249, 115, 22, 0.3);
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .tildra-overlay-content {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }
            
            .skills-section, .content-section {
                margin-bottom: 24px;
            }
            
            .skills-section h3, .content-section h3 {
                color: #ffffff;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 12px;
            }
            
            .skill-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .skill-tag {
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .skill-tag.highlighted {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%);
                color: #10b981;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            
            .skill-tag.missing {
                background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(251, 146, 60, 0.2) 100%);
                color: #f97316;
                border: 1px solid rgba(249, 115, 22, 0.3);
            }
            
            .content-preview {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 16px;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .tailored-code {
                color: #e5e7eb;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 13px;
                line-height: 1.5;
                margin: 0;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            
            .action-section {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 20px;
            }
            
            .tildra-action-btn {
                padding: 10px 16px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .tildra-action-btn.primary {
                background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
                color: white;
            }
            
            .tildra-action-btn.secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #a0a0b0;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .tildra-action-btn.tertiary {
                background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(251, 146, 60, 0.2) 100%);
                color: #f97316;
                border: 1px solid rgba(249, 115, 22, 0.3);
            }
            
            .tildra-action-btn:hover {
                transform: translateY(-1px);
                filter: brightness(1.1);
            }
        `;
        
        document.head.appendChild(styles);
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('tildra-close-overlay')?.addEventListener('click', () => {
            overlay.remove();
            styles.remove();
        });
        
        document.getElementById('tildra-copy-content')?.addEventListener('click', () => {
            navigator.clipboard.writeText(tailoredContent.content);
            alert('✅ Content copied to clipboard!');
        });
        
        document.getElementById('tildra-download-content')?.addEventListener('click', () => {
            const fileName = `tailored_resume_${jobDetails.company}_${jobDetails.title}.${tailoredContent.type === 'latex' ? 'tex' : 'txt'}`;
            const blob = new Blob([tailoredContent.content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName.replace(/[^a-z0-9_\-.]/gi, '_');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        
        document.getElementById('tildra-refine-ai')?.addEventListener('click', () => {
            alert('🔄 AI refinement feature coming soon!');
        });
        
        // Close on backdrop click
        document.querySelector('.tildra-overlay-backdrop')?.addEventListener('click', () => {
            overlay.remove();
            styles.remove();
        });
    }
}); 