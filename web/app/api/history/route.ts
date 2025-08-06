import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[History API] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log(`[History API] Fetching history for user ${userId}`);

    // Get user's summary history from database
    const summaries = await prisma.summaryHistory.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[History API] Successfully fetched ${summaries.length} summaries for ${userId}`);
    
    return new NextResponse(JSON.stringify(summaries), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[History API] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[History API DELETE] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log(`[History API DELETE] Clearing history for user ${userId}`);

    // Delete all summaries for this user
    const deleteResult = await prisma.summaryHistory.deleteMany({
      where: {
        userId: userId
      }
    });

    console.log(`[History API DELETE] Successfully cleared ${deleteResult.count} summaries for ${userId}`);
    
    return new NextResponse(null, {
      status: 204
    });

  } catch (error) {
    console.error('[History API DELETE] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}