import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

// Use INTERNAL_API_URL for server-to-server communication
// Fallback to production URL for reliability
const backendApiBaseUrl = process.env.INTERNAL_API_URL 
  || process.env.NEXT_PUBLIC_API_BASE_URL 
  || 'https://tildra.fly.dev';

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    const token = await getToken();

    if (!userId || !token) {
      console.error('[API Proxy /create-checkout-session] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Parse the request body
    const body = await req.json();
    const { price_lookup_key } = body;

    if (!price_lookup_key) {
      console.error('[API Proxy /create-checkout-session] Missing price_lookup_key in request body.');
      return new NextResponse(JSON.stringify({ error: 'price_lookup_key is required' }), { status: 400 });
    }

    const targetUrl = `${backendApiBaseUrl}/create-checkout-session`;
    console.log(`[API Proxy /create-checkout-session] Forwarding request for ${userId} to ${targetUrl}`);

    // Forward the request to the backend API
    const backendResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ price_lookup_key }),
      cache: 'no-store', // Don't cache the checkout session request
    });

    // Handle response from the backend
    const responseBody = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`[API Proxy /create-checkout-session] Backend error (${backendResponse.status}):`, responseBody);
      // Forward the backend's error status and message
      return new NextResponse(JSON.stringify({ error: responseBody.detail || 'Failed to create checkout session' }), {
        status: backendResponse.status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`[API Proxy /create-checkout-session] Successfully created checkout session for ${userId}. URL: ${responseBody.url}`);
    // Forward the successful response from the backend
    return new NextResponse(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[API Proxy /create-checkout-session] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
} 