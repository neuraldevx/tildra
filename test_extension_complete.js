/**
 * Tildra Extension Complete Test Script
 * 
 * This script can be run in any browser console to test if the
 * extension components work correctly.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Press Enter to run
 * 4. Check the console for test results
 */

console.log("🧪 Starting Tildra Extension Complete Test...");

// Test 1: Load Readability Library
async function testReadabilityLibrary() {
    console.log("\n📚 Test 1: Testing Readability Library...");
    
    try {
        // Try to create a simple document to test Readability
        const testHTML = `
            <html>
                <head><title>Test Article</title></head>
                <body>
                    <h1>Test Article Title</h1>
                    <p>This is a test paragraph with substantial content to test the Readability library functionality.</p>
                    <p>Another paragraph with more content to ensure proper extraction.</p>
                    <div class="advertisement">This is an ad that should be removed.</div>
                    <p>Final paragraph with important content that should be preserved in the summary.</p>
                </body>
            </html>
        `;
        
        // Create a DOMParser to test Readability
        const parser = new DOMParser();
        const testDoc = parser.parseFromString(testHTML, 'text/html');
        
        // This will fail if Readability is not loaded
        if (typeof Readability === 'undefined') {
            console.log("❌ Readability library not found - loading from CDN...");
            
            // Try loading Readability from CDN
            const script = document.createElement('script');
            script.src = 'https://raw.githubusercontent.com/mozilla/readability/main/Readability.js';
            document.head.appendChild(script);
            
            await new Promise(resolve => {
                script.onload = resolve;
                script.onerror = () => {
                    console.error("❌ Failed to load Readability from CDN");
                    resolve();
                };
            });
        }
        
        if (typeof Readability !== 'undefined') {
            const reader = new Readability(testDoc.cloneNode(true));
            const article = reader.parse();
            
            if (article && article.textContent) {
                console.log("✅ Readability library working correctly");
                console.log("📄 Extracted content:", article.textContent.substring(0, 100) + "...");
                return true;
            } else {
                console.log("❌ Readability failed to parse test content");
                return false;
            }
        } else {
            console.log("❌ Readability library could not be loaded");
            return false;
        }
    } catch (error) {
        console.error("❌ Readability test failed:", error);
        return false;
    }
}

// Test 2: API Connection Test
async function testAPIConnection() {
    console.log("\n🌐 Test 2: Testing API Connection...");
    
    try {
        const response = await fetch('https://tildra.fly.dev/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log("✅ API health check successful");
            return true;
        } else {
            console.log(`❌ API health check failed: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error("❌ API connection test failed:", error);
        return false;
    }
}

// Test 3: Test Current Page Content Extraction
function testContentExtraction() {
    console.log("\n📄 Test 3: Testing Content Extraction on Current Page...");
    
    try {
        const pageTitle = document.title;
        const pageText = document.body ? document.body.innerText : '';
        
        if (pageText.length > 100) {
            console.log("✅ Page content extraction successful");
            console.log(`📝 Page title: ${pageTitle}`);
            console.log(`📊 Content length: ${pageText.length} characters`);
            console.log(`📄 First 100 chars: ${pageText.substring(0, 100)}...`);
            return true;
        } else {
            console.log("❌ Insufficient page content found");
            return false;
        }
    } catch (error) {
        console.error("❌ Content extraction test failed:", error);
        return false;
    }
}

// Test 4: Test API Summarization (Development Mode)
async function testAPISummarization() {
    console.log("\n🤖 Test 4: Testing API Summarization...");
    
    try {
        const testContent = `
        Artificial Intelligence (AI) has become one of the most transformative technologies of the 21st century. 
        From machine learning algorithms that power recommendation systems to natural language processing models 
        that enable chatbots, AI is reshaping industries and changing how we interact with technology.
        
        The benefits of AI include increased efficiency, better decision-making through data analysis, 
        and the automation of repetitive tasks. However, there are also concerns about job displacement, 
        privacy issues, and the need for ethical AI development.
        
        As AI continues to evolve, it's important for society to carefully consider both its potential 
        and its challenges to ensure that this powerful technology is used responsibly and beneficially.
        `;
        
        const response = await fetch('https://tildra.fly.dev/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': 'user_2xtGvoam7eCBidIQUaBWM1K0jLN' // Development mode header
            },
            body: JSON.stringify({
                article_text: testContent,
                url: window.location.href,
                title: 'Test Article: The Impact of AI',
                summary_length: 'standard'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ API summarization successful");
            console.log("📋 Summary:", result);
            return true;
        } else {
            const errorText = await response.text();
            console.log(`❌ API summarization failed: ${response.status} - ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error("❌ API summarization test failed:", error);
        return false;
    }
}

// Test 5: Check Extension Files (if extension is installed)
function testExtensionFiles() {
    console.log("\n🔧 Test 5: Checking Extension Installation...");
    
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            console.log("✅ Chrome extension API available");
            console.log(`📦 Extension ID: ${chrome.runtime.id || 'Unknown'}`);
            return true;
        } else {
            console.log("ℹ️ Extension not installed or not in extension context");
            return false;
        }
    } catch (error) {
        console.error("❌ Extension check failed:", error);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    console.log("🚀 Running Tildra Extension Complete Tests...\n");
    
    const results = {
        readability: await testReadabilityLibrary(),
        apiConnection: await testAPIConnection(),
        contentExtraction: testContentExtraction(),
        apiSummarization: await testAPISummarization(),
        extensionFiles: testExtensionFiles()
    };
    
    console.log("\n📊 Test Results Summary:");
    console.log("========================");
    
    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? "✅ PASS" : "❌ FAIL";
        console.log(`${test}: ${status}`);
    });
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log("🎉 All tests passed! Extension should work correctly.");
    } else if (passedTests >= 3) {
        console.log("⚠️ Most tests passed. Extension should work with minor issues.");
    } else {
        console.log("🚨 Multiple test failures. Extension may not work properly.");
    }
    
    return results;
}

// Auto-run tests
runAllTests().catch(error => {
    console.error("🚨 Test runner failed:", error);
});

// Instructions for manual testing
console.log(`
📝 Manual Testing Instructions:
===============================

1. Install Extension:
   - Go to chrome://extensions/
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the extension folder
   - Should show version 1.8.9

2. Test Authentication:
   - Visit https://tildra.xyz
   - Sign in with your account
   - Check browser console for auth logs

3. Test Summarization:
   - Go to any news article or blog post
   - Click the Tildra extension icon
   - Click "Summarize This Page"
   - Should see summary in popup

4. Check Debug Logs:
   - All actions should show debug logs in console
   - Look for "[Tildra Debug]" messages

5. Common Issues:
   - If "Readability is not defined": Reload extension
   - If "Not signed in": Visit tildra.xyz and sign in
   - If "Could not communicate": Reload the webpage
`); 