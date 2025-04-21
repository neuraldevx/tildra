'use client'

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function ChromeTokenHelper() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // Ensure this only runs in the browser and the Chrome extension API is available
    if (typeof window !== 'undefined' && window.chrome && chrome.runtime && chrome.runtime.onMessage) {
      const messageListener = async (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        // Check if the message is from our extension (optional but recommended for security)
        // Note: You might need to adjust this check based on your extension ID and how you send messages
        // if (sender.id !== 'YOUR_EXTENSION_ID') { 
        //   console.log('Message ignored: Not from expected extension.');
        //   return false; // Indicate listener is still active but didn't handle
        // }

        if (message.action === 'getFreshClerkToken') {
          console.log('[Web App] Received getFreshClerkToken request from extension.');
          if (!isLoaded) {
            console.log('[Web App] Clerk not loaded yet, cannot provide token.');
            sendResponse({ success: false, error: 'Clerk not ready' });
            return true; // Indicate async response is coming (or failed)
          }
          if (!isSignedIn) {
            console.log('[Web App] User not signed in, cannot provide token.');
            sendResponse({ success: false, error: 'User not signed in' });
            return true; // Indicate async response is coming (or failed)
          }

          try {
            const token = await getToken(); // Get potentially refreshed token
            if (token) {
              console.log('[Web App] Sending fresh token back to extension.');
              sendResponse({ success: true, token: token });
            } else {
              console.log('[Web App] Failed to get fresh token (null).');
              sendResponse({ success: false, error: 'Failed to retrieve token' });
            }
          } catch (error) {
            console.error('[Web App] Error getting fresh token:', error);
            sendResponse({ success: false, error: `Error fetching token: ${error instanceof Error ? error.message : String(error)}` });
          }
          return true; // Indicate that we will send a response asynchronously
        }

        // Handle other messages or ignore
        return false; // Indicate listener is still active but didn't handle this message
      };

      console.log('[Web App] Adding Chrome message listener for getFreshClerkToken.');
      chrome.runtime.onMessage.addListener(messageListener);

      // Cleanup listener on component unmount
      return () => {
        console.log('[Web App] Removing Chrome message listener.');
        chrome.runtime.onMessage.removeListener(messageListener);
      };
    }
  }, [isLoaded, isSignedIn, getToken]); // Rerun effect if auth state changes

  // This component doesn't render anything visual
  return null;
} 