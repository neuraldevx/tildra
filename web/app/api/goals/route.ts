import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    const token = await getToken();

    if (!userId || !token) {
      console.error('[API Proxy /goals] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const backendApiBaseUrl = process.env.INTERNAL_API_URL
      || 'https://tildra.fly.dev';

    const targetUrl = `${backendApiBaseUrl}/api/goals`;
    console.log(`[API Proxy /goals] Forwarding GET request for ${userId} to ${targetUrl}`);

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
      console.error(`[API Proxy /goals] Backend error (${backendResponse.status})`);
      
      // If the backend endpoint doesn't exist, return empty goals
      if (backendResponse.status === 404) {
        return new NextResponse(JSON.stringify([]), { status: 200 });
      }
      
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch goals' }), {
        status: backendResponse.status
      });
    }

    const responseBody = await backendResponse.json();
    console.log(`[API Proxy /goals] Successfully fetched goals for ${userId}`);
    
    return new NextResponse(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[API Proxy /goals] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, getToken } = await auth();
    const token = await getToken();

    if (!userId || !token) {
      console.error('[API Proxy /goals POST] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    
    const backendApiBaseUrl = process.env.INTERNAL_API_URL
      || 'https://tildra.fly.dev';

    const targetUrl = `${backendApiBaseUrl}/api/goals`;
    console.log(`[API Proxy /goals POST] Forwarding POST request for ${userId} to ${targetUrl}`);

    // Forward the request to the backend API
    const backendResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    // Handle response from the backend
    if (!backendResponse.ok) {
      console.error(`[API Proxy /goals POST] Backend error (${backendResponse.status})`);
      return new NextResponse(JSON.stringify({ error: 'Failed to create goal' }), {
        status: backendResponse.status
      });
    }

    const responseBody = await backendResponse.json();
    console.log(`[API Proxy /goals POST] Successfully created goal for ${userId}`);
    
    return new NextResponse(JSON.stringify(responseBody), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[API Proxy /goals POST] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}