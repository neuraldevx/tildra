/**
 * This script is injected directly into the tildra.xyz page.
 * Its only job is to get the Clerk JWT from localStorage and post it
 * as a message back to the window, where the content script can receive it.
 * This avoids any cross-context issues with accessing localStorage.
 */
(function() {
    console.log("[Tildra Injector] Running token extraction...");
    
    try {
        // Look for all possible Clerk token keys
        const allKeys = Object.keys(localStorage);
        console.log("[Tildra Injector] Found localStorage keys:", allKeys);
        
        // Find Clerk JWT keys
        const clerkKeys = allKeys.filter(key => 
            key.startsWith('__clerk_db_jwt') || 
            key.includes('clerk') && key.includes('jwt')
        );
        
        console.log("[Tildra Injector] Found Clerk keys:", clerkKeys);
        
        if (clerkKeys.length > 0) {
            // Try each key until we find a valid token
            for (const key of clerkKeys) {
                try {
                    const tokenData = JSON.parse(localStorage.getItem(key));
                    console.log("[Tildra Injector] Token data for key", key, ":", tokenData);
                    
                    if (tokenData && tokenData.jwt) {
                        console.log("[Tildra Injector] Found valid JWT token, posting message");
                        window.postMessage({ 
                            type: "TILDRA_AUTH_TOKEN", 
                            token: tokenData.jwt,
                            source: "injector",
                            timestamp: Date.now()
                        }, "*");
                        break;
                    }
                } catch (parseError) {
                    console.warn("[Tildra Injector] Failed to parse token data for key", key, ":", parseError);
                }
            }
        } else {
            console.log("[Tildra Injector] No Clerk JWT keys found in localStorage");
            
            // Check if user might be signed out
            const hasClerkData = allKeys.some(key => key.includes('clerk'));
            if (hasClerkData) {
                console.log("[Tildra Injector] Found some Clerk data but no JWT - user might be signed out");
            } else {
                console.log("[Tildra Injector] No Clerk data found at all - user definitely not signed in");
            }
        }
        
    } catch (e) {
        console.error("[Tildra Injector] Error during token extraction:", e);
    }
    
    // Remove this script element after execution
    const scripts = document.querySelectorAll('script[src*="injector.js"]');
    scripts.forEach(script => script.remove());
    
    console.log("[Tildra Injector] Injector script completed and removed");
})(); 