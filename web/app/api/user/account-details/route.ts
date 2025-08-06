import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[Account Details API] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log(`[Account Details API] Fetching account details for user ${userId}`);

    // Get user details from database
    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId
      },
      select: {
        email: true,
        plan: true,
        summariesUsed: true,
        summaryLimit: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
        totalSummariesMade: true,
        createdAt: true
      }
    });

    if (!user) {
      console.error(`[Account Details API] User not found in database: ${userId}`);
      return new NextResponse(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Determine if user is pro based on plan and subscription
    const isPro = user.plan === 'premium' || 
                  (user.stripeSubscriptionId && user.stripeCurrentPeriodEnd && 
                   new Date(user.stripeCurrentPeriodEnd) > new Date());

    const accountDetails = {
      email: user.email,
      plan: isPro ? 'Premium' : 'Free',
      summariesUsed: user.summariesUsed,
      summaryLimit: isPro ? 1000 : user.summaryLimit, // Premium users get much higher limit
      is_pro: isPro,
      totalSummariesMade: user.totalSummariesMade,
      memberSince: user.createdAt,
      // Include subscription details if available
      ...(user.stripeCustomerId && {
        stripeCustomerId: user.stripeCustomerId,
        hasActiveSubscription: isPro
      })
    };

    console.log(`[Account Details API] Successfully fetched account details for ${userId}`);
    
    return new NextResponse(JSON.stringify(accountDetails), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[Account Details API] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
} 