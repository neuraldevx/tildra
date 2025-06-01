import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    const token = await getToken();

    if (!userId || !token) {
      console.error('[API Proxy /history] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const backendApiBaseUrl = process.env.INTERNAL_API_URL
      || 'https://tildra.fly.dev';

    const targetUrl = `${backendApiBaseUrl}/api/history`;
    console.log(`[API Proxy /history] Forwarding request for ${userId} to ${targetUrl}`);

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
      console.error(`[API Proxy /history] Backend error (${backendResponse.status})`);
      
      // If the backend endpoint doesn't exist, return an empty history
      if (backendResponse.status === 404) {
        return new NextResponse(JSON.stringify({ 
          history: [],
          message: 'History endpoint not implemented yet' 
        }), { status: 200 });
      }
      
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch history' }), {
        status: backendResponse.status
      });
    }

    const responseBody = await backendResponse.json();
    console.log(`[API Proxy /history] Successfully fetched history for ${userId}`);
    
    return new NextResponse(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[API Proxy /history] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
} 