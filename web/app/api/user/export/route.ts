import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user account details
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        email: true,
        plan: true,
        summariesUsed: true,
        summaryLimit: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user summaries
    const summaries = await prisma.summaryHistory.findMany({
      where: { userId: userId },
      select: {
        id: true,
        url: true,
        title: true,
        tldr: true,
        keyPoints: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    // Prepare export data
    const exportData = {
      user: {
        email: user.email,
        plan: user.plan,
        summariesUsed: user.summariesUsed,
        summaryLimit: user.summaryLimit,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      summaries: summaries.map((summary: any) => ({
        id: summary.id,
        url: summary.url,
        title: summary.title,
        tldr: summary.tldr,
        keyPoints: summary.keyPoints,
        createdAt: summary.createdAt,
      })),
      exportedAt: new Date().toISOString(),
      totalSummaries: summaries.length,
    }

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="tildra-data-export.json"',
      },
    })

  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
} 