import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const BACKEND_API_BASE_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://tildra.fly.dev';

console.log('[DEBUG] Environment variables:');
console.log('INTERNAL_API_URL:', process.env.INTERNAL_API_URL);
console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

const backendApiBaseUrl = BACKEND_API_BASE_URL;
console.log('[DEBUG] Final backendApiBaseUrl:', backendApiBaseUrl);

export async function GET() {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      console.log('[API Proxy /user/status] No user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[API Proxy /user/status] Forwarding request for user ${userId} to ${backendApiBaseUrl}/api/user/status`);

    const token = await getToken();
    if (!token) {
      console.log('[API Proxy /user/status] No token found');
      return NextResponse.json({ error: 'No token available' }, { status: 401 });
    }

    const response = await fetch(`${backendApiBaseUrl}/api/user/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[API Proxy /user/status] Backend error (${response.status})`);
      const errorText = await response.text();
      console.log(`[API Proxy /user/status] Backend error details:`, errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[API Proxy /user/status] Success:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API Proxy /user/status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}