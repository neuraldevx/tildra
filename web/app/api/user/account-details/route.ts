import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Debug logging
console.log('[DEBUG] Environment variables:');
console.log('INTERNAL_API_URL:', process.env.INTERNAL_API_URL);
console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

const backendApiBaseUrl = process.env.INTERNAL_API_URL 
  || process.env.NEXT_PUBLIC_API_BASE_URL 
  || 'https://snipsummary.fly.dev';

console.log('[DEBUG] Final backendApiBaseUrl:', backendApiBaseUrl);

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    const token = await getToken();

    if (!userId || !token) {
      console.error('[API Proxy /user/account-details] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const targetUrl = `${backendApiBaseUrl}/api/user/account-details`;
    console.log(`[API Proxy /user/account-details] Forwarding request for ${userId} to ${targetUrl}`);

    // Forward the request to the backend API
    const backendResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    // Handle response from the backend
    if (!backendResponse.ok) {
      console.error(`[API Proxy /user/account-details] Backend error (${backendResponse.status})`);
      
      // If the backend endpoint doesn't exist, return a basic response
      if (backendResponse.status === 404) {
        return new NextResponse(JSON.stringify({ 
          message: 'Account details endpoint not implemented yet' 
        }), { status: 404 });
      }
      
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch account details' }), {
        status: backendResponse.status
      });
    }

    const responseBody = await backendResponse.json();
    console.log(`[API Proxy /user/account-details] Successfully fetched account details for ${userId}`);
    
    return new NextResponse(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[API Proxy /user/account-details] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
} 