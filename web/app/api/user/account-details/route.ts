import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  // Use INTERNAL_API_URL which should point directly to the backend service
  // (e.g., http://localhost:8000 locally, or internal service URL in prod)
  // Fallback to localhost:8000 if not set (adjust if your backend runs elsewhere)
  const internalApiBaseUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000';
  const url = `${internalApiBaseUrl}/api/user/account-details`; // MODIFIED to new endpoint
  
  console.log(`[API Proxy Account-Details] Forwarding to: ${url}`);

  try {
    const res = await fetch(url, {
      headers: { authorization: auth },
      cache: 'no-store', // Ensure fresh data from backend
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error(`[API Proxy Account-Details] Backend error (${res.status}):`, data);
      return NextResponse.json(data, { status: res.status });
    }
    
    console.log("[API Proxy Account-Details] Successfully fetched account details:", data);
    return NextResponse.json(data, { status: res.status });

  } catch (error) {
    console.error("[API Proxy Account-Details] Error fetching account details:", error);
    return NextResponse.json(
      { error: 'Failed to fetch account details from backend' }, 
      { status: 500 }
    );
  }
} 