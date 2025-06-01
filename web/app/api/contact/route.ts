import { NextRequest, NextResponse } from 'next/server'

// Use INTERNAL_API_URL for server-to-server communication
const backendApiBaseUrl = process.env.INTERNAL_API_URL || 'https://tildra.fly.dev'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    // Validate the input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const targetUrl = `${backendApiBaseUrl}/api/contact`
    console.log(`[API Proxy /contact] Forwarding contact form submission to ${targetUrl}`)

    // Forward the request to the backend API
    const backendResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        recipient: 'support@tildra.xyz'
      }),
      cache: 'no-store',
    })

    // Handle response from the backend
    if (!backendResponse.ok) {
      console.error(`[API Proxy /contact] Backend error (${backendResponse.status})`)
      
      const errorBody = await backendResponse.json().catch(() => ({ error: 'Unknown error' }))
      return NextResponse.json({ error: errorBody.detail || 'Failed to send message' }, {
        status: backendResponse.status
      })
    }

    const responseBody = await backendResponse.json()
    console.log(`[API Proxy /contact] Successfully sent contact form submission`)
    
    return NextResponse.json(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('[API Proxy /contact] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
} 