import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
  request: Request,
  { params }: { params: { goal_id: string } }
) {
  try {
    const { userId, getToken } = await auth();
    const token = await getToken();

    if (!userId || !token) {
      console.error('[API Proxy /goals DELETE] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const goalId = params.goal_id;
    
    const backendApiBaseUrl = process.env.INTERNAL_API_URL
      || 'https://tildra.fly.dev';

    const targetUrl = `${backendApiBaseUrl}/api/goals/${goalId}`;
    console.log(`[API Proxy /goals DELETE] Forwarding DELETE request for goal ${goalId} for ${userId} to ${targetUrl}`);

    // Forward the request to the backend API
    const backendResponse = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    // Handle response from the backend
    if (!backendResponse.ok) {
      console.error(`[API Proxy /goals DELETE] Backend error (${backendResponse.status})`);
      return new NextResponse(JSON.stringify({ error: 'Failed to delete goal' }), {
        status: backendResponse.status
      });
    }

    console.log(`[API Proxy /goals DELETE] Successfully deleted goal ${goalId} for ${userId}`);
    
    return new NextResponse(null, {
      status: 204
    });

  } catch (error) {
    console.error('[API Proxy /goals DELETE] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}