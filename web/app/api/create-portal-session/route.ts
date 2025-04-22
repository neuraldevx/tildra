import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

// Use INTERNAL_API_URL for server-to-server communication
// Fallback to public URL or localhost for flexibility
const backendApiBaseUrl = process.env.INTERNAL_API_URL 
  || process.env.NEXT_PUBLIC_API_BASE_URL 
  || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    const token = await getToken();

    if (!userId || !token) {
      console.error('[API Proxy /create-portal-session] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const targetUrl = `${backendApiBaseUrl}/api/create-portal-session`;
    console.log(`[API Proxy /create-portal-session] Forwarding request for ${userId} to ${targetUrl}`);

    // Forward the request to the backend API
    const backendResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // No Content-Type needed for this POST request as it has no body
      },
      cache: 'no-store', // Don't cache the portal session request
    });

    // Handle response from the backend
    const responseBody = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`[API Proxy /create-portal-session] Backend error (${backendResponse.status}):`, responseBody);
      // Forward the backend's error status and message
      return new NextResponse(JSON.stringify({ error: responseBody.detail || 'Failed to create portal session' }), {
        status: backendResponse.status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`[API Proxy /create-portal-session] Successfully created portal session for ${userId}. URL: ${responseBody.url}`);
    // Forward the successful response from the backend
    return new NextResponse(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[API Proxy /create-portal-session] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
} 