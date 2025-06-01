import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Use INTERNAL_API_URL for server-to-server communication
const backendApiBaseUrl = process.env.INTERNAL_API_URL
  || 'https://tildra.fly.dev';

// GET user settings
export async function GET(request: NextRequest) {
  try {
    const { userId, getToken } = await auth()
    const token = await getToken()
    
    if (!userId || !token) {
      console.error('[API Proxy /user/settings] User not authenticated.')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const targetUrl = `${backendApiBaseUrl}/api/user/settings`
    console.log(`[API Proxy /user/settings] Forwarding GET request for ${userId} to ${targetUrl}`)

    // Forward the request to the backend API
    const backendResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    // Handle response from the backend
    if (!backendResponse.ok) {
      console.error(`[API Proxy /user/settings] Backend GET error (${backendResponse.status})`)
      
      // If the backend endpoint doesn't exist, return default settings
      if (backendResponse.status === 404) {
        return NextResponse.json({
          emailNotifications: true,
          summaryNotifications: true,
          marketingEmails: false,
        })
      }
      
      return NextResponse.json({ error: 'Failed to fetch settings' }, {
        status: backendResponse.status
      })
    }

    const responseBody = await backendResponse.json()
    console.log(`[API Proxy /user/settings] Successfully fetched settings for ${userId}`)
    
    return NextResponse.json(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('[API Proxy /user/settings] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT (update) user settings
export async function PUT(request: NextRequest) {
  try {
    const { userId, getToken } = await auth()
    const token = await getToken()
    
    if (!userId || !token) {
      console.error('[API Proxy /user/settings] User not authenticated.')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { emailNotifications, summaryNotifications, marketingEmails } = body

    // Validate the input
    if (
      typeof emailNotifications !== 'boolean' ||
      typeof summaryNotifications !== 'boolean' ||
      typeof marketingEmails !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      )
    }

    const targetUrl = `${backendApiBaseUrl}/api/user/settings`
    console.log(`[API Proxy /user/settings] Forwarding PUT request for ${userId} to ${targetUrl}`)

    // Forward the request to the backend API
    const backendResponse = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emailNotifications, summaryNotifications, marketingEmails }),
      cache: 'no-store',
    })

    // Handle response from the backend
    if (!backendResponse.ok) {
      console.error(`[API Proxy /user/settings] Backend PUT error (${backendResponse.status})`)
      
      const errorBody = await backendResponse.json().catch(() => ({ error: 'Unknown error' }))
      return NextResponse.json({ error: errorBody.detail || 'Failed to update settings' }, {
        status: backendResponse.status
      })
    }

    const responseBody = await backendResponse.json()
    console.log(`[API Proxy /user/settings] Successfully updated settings for ${userId}`)
    
    return NextResponse.json(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('[API Proxy /user/settings] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
} 