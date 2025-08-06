import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.log('[User Status API] No user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[User Status API] Fetching status for user ${userId}`);

    // Get user status from database
    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        plan: true,
        summariesUsed: true,
        summaryLimit: true,
        totalSummariesMade: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      // User doesn't exist in database yet, return a basic status
      console.log(`[User Status API] User not found in database, returning basic status for ${userId}`);
      return NextResponse.json({
        user_id: userId,
        plan: 'free',
        summaries_used: 0,
        summary_limit: 5,
        is_pro: false,
        exists_in_db: false
      });
    }

    // Determine if user is pro
    const isPro = user.plan === 'premium' || 
                  (user.stripeSubscriptionId && user.stripeCurrentPeriodEnd && 
                   new Date(user.stripeCurrentPeriodEnd) > new Date());

    const status = {
      user_id: userId,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      plan: isPro ? 'premium' : 'free',
      summaries_used: user.summariesUsed,
      summary_limit: isPro ? 1000 : user.summaryLimit,
      total_summaries_made: user.totalSummariesMade,
      is_pro: isPro,
      exists_in_db: true,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      ...(user.stripeSubscriptionId && {
        has_active_subscription: isPro,
        subscription_end: user.stripeCurrentPeriodEnd
      })
    };

    console.log('[User Status API] Success for user:', userId);
    return NextResponse.json(status);

  } catch (error) {
    console.error('[User Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}