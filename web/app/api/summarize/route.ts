import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Get auth data
    const { userId } = await auth(); 

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new NextResponse("Missing authorization header", { status: 401 });
    }

    // Forward request to backend API
    const internalApiBaseUrl = process.env.INTERNAL_API_URL || 'https://tildra.fly.dev';
    const backendUrl = `${internalApiBaseUrl}/summarize`;
    
    console.log(`[API Proxy Summarize] Forwarding to: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[API Proxy Summarize] Backend error (${response.status}):`, data);
      return NextResponse.json(data, { status: response.status });
    }
    
    console.log("[API Proxy Summarize] Successfully processed summarization request");
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("[API Proxy Summarize] Error:", error);
    return NextResponse.json(
      { error: 'Failed to process summarization request' }, 
      { status: 500 }
    );
  }
} 