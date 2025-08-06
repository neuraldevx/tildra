import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[Goals API] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log(`[Goals API] Fetching goals for user ${userId}`);

    // Get user's goals from database
    const goals = await prisma.goal.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Update current values for each goal based on recent activity
    const updatedGoals = await Promise.all(goals.map(async (goal) => {
      const currentValue = await calculateCurrentGoalValue(userId, goal.type, goal.period);
      
      // Update the goal in database if current value changed
      if (currentValue !== goal.current) {
        await prisma.goal.update({
          where: { id: goal.id },
          data: { current: currentValue }
        });
      }
      
      return {
        ...goal,
        current: currentValue
      };
    }));

    console.log(`[Goals API] Successfully fetched ${updatedGoals.length} goals for ${userId}`);
    
    return new NextResponse(JSON.stringify(updatedGoals), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[Goals API] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[Goals API POST] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { type, target, period, isActive = true } = body;

    // Validate required fields
    if (!type || !target || !period) {
      return new NextResponse(JSON.stringify({ 
        error: 'Missing required fields: type, target, and period are required' 
      }), { status: 400 });
    }

    // Validate goal type
    const validGoalTypes = ['daily_summaries', 'weekly_time_saved', 'monthly_summaries', 'reading_efficiency'];
    if (!validGoalTypes.includes(type)) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid goal type. Must be one of: ' + validGoalTypes.join(', ')
      }), { status: 400 });
    }

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      }), { status: 400 });
    }

    console.log(`[Goals API POST] Creating goal for user ${userId}`);

    // Calculate current value for this goal
    const currentValue = await calculateCurrentGoalValue(userId, type, period);

    // Create the goal
    const goal = await prisma.goal.create({
      data: {
        userId,
        type,
        target: parseInt(target),
        current: currentValue,
        period,
        isActive
      }
    });

    console.log(`[Goals API POST] Successfully created goal ${goal.id} for ${userId}`);
    
    return new NextResponse(JSON.stringify(goal), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[Goals API POST] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

async function calculateCurrentGoalValue(userId: string, goalType: string, period: string): Promise<number> {
  const now = new Date();
  let startDate: Date;

  // Calculate period start date
  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Make Monday the first day
      startDate = new Date(now.getTime() - mondayOffset * 24 * 60 * 60 * 1000);
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow to include today

  // Get summaries in the period
  const summaries = await prisma.summaryHistory.findMany({
    where: {
      userId: userId,
      createdAt: {
        gte: startDate,
        lt: endDate
      }
    }
  });

  switch (goalType) {
    case 'daily_summaries':
      return period === 'daily' ? summaries.length : Math.round(summaries.length / getDaysBetween(startDate, now));
    
    case 'weekly_time_saved':
      const timeSaved = summaries.reduce((total, summary) => {
        const originalLength = summary.title ? summary.title.length + (summary.url ? 500 : 0) : 500;
        const summaryLength = summary.tldr.length + (summary.keyPoints?.join(' ').length || 0);
        const wordsReduction = Math.max(originalLength - summaryLength, 0);
        return total + Math.max(wordsReduction / 250 * 60, 2); // Min 2 minutes saved
      }, 0);
      return Math.round(timeSaved);
    
    case 'monthly_summaries':
      return summaries.length;
    
    case 'reading_efficiency':
      if (summaries.length === 0) return 0;
      // Calculate average efficiency (estimated based on summary length vs original)
      const efficiency = summaries.reduce((total, summary) => {
        const originalLength = summary.title ? summary.title.length + (summary.url ? 500 : 0) : 500;
        const summaryLength = summary.tldr.length + (summary.keyPoints?.join(' ').length || 0);
        const reduction = Math.max((originalLength - summaryLength) / originalLength * 100, 50);
        return total + reduction;
      }, 0);
      return Math.round(efficiency / summaries.length);
    
    default:
      return 0;
  }
}

function getDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1);
}