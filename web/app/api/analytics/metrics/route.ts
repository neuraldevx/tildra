import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[Analytics Metrics] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log(`[Analytics Metrics] Fetching metrics for user ${userId}`);

    // Get user's summary history from database
    const summaries = await prisma.summaryHistory.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (summaries.length === 0) {
      // Return default metrics for users with no summaries
      return new NextResponse(JSON.stringify({
        totalTimeSaved: 0,
        totalSummaries: 0,
        averageReadingTimeReduction: 0,
        weeklyTimeSaved: 0,
        monthlyTimeSaved: 0,
        productivityScore: 0,
        streakDays: 0,
        topCategories: [],
        weeklyData: [],
        monthlyData: []
      }), { status: 200 });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate time saved estimates (based on typical reading speeds and summary lengths)
    const calculateTimeSaved = (summary: any) => {
      const originalLength = summary.title ? summary.title.length + (summary.url ? 500 : 0) : 500; // Estimated original length
      const summaryLength = summary.tldr.length + (summary.keyPoints?.join(' ').length || 0);
      const wordsReduction = Math.max(originalLength - summaryLength, 0);
      return Math.max(wordsReduction / 250 * 60, 2); // Assuming 250 words per minute, min 2 minutes saved
    };

    // Calculate metrics
    const totalTimeSaved = summaries.reduce((total, summary) => total + calculateTimeSaved(summary), 0);
    
    const weeklySummaries = summaries.filter(s => new Date(s.createdAt) >= oneWeekAgo);
    const weeklyTimeSaved = weeklySummaries.reduce((total, summary) => total + calculateTimeSaved(summary), 0);
    
    const monthlySummaries = summaries.filter(s => new Date(s.createdAt) >= oneMonthAgo);
    const monthlyTimeSaved = monthlySummaries.reduce((total, summary) => total + calculateTimeSaved(summary), 0);

    // Calculate streak days
    let streakDays = 0;
    const sortedDates = [...new Set(summaries.map(s => s.createdAt.toDateString()))].sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      const expectedDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      if (currentDate.toDateString() === expectedDate.toDateString()) {
        streakDays++;
      } else {
        break;
      }
    }

    // Generate categories based on URL domains
    const categoryMap: Record<string, { count: number; timeSaved: number }> = {};
    summaries.forEach(summary => {
      let category = 'general';
      if (summary.url) {
        try {
          const domain = new URL(summary.url).hostname;
          if (domain.includes('github')) category = 'technical';
          else if (domain.includes('medium') || domain.includes('blog')) category = 'articles';
          else if (domain.includes('news') || domain.includes('cnn') || domain.includes('bbc')) category = 'news';
          else if (domain.includes('wiki')) category = 'research';
          else if (domain.includes('youtube') || domain.includes('video')) category = 'video';
          else category = 'web';
        } catch {
          category = 'general';
        }
      }
      
      if (!categoryMap[category]) {
        categoryMap[category] = { count: 0, timeSaved: 0 };
      }
      categoryMap[category].count++;
      categoryMap[category].timeSaved += calculateTimeSaved(summary);
    });

    const topCategories = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        count: data.count,
        timeSaved: data.timeSaved,
        averageLength: data.timeSaved / data.count
      }))
      .sort((a, b) => b.count - a.count);

    // Generate weekly data for charts
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const daySummaries = summaries.filter(s => 
        s.createdAt >= dayStart && s.createdAt < dayEnd
      );
      
      weeklyData.push({
        week: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        summaries: daySummaries.length,
        timeSaved: daySummaries.reduce((total, s) => total + calculateTimeSaved(s), 0),
        avgWordsReduced: daySummaries.length > 0 ? 
          daySummaries.reduce((total, s) => total + 300, 0) / daySummaries.length : 0
      });
    }

    // Generate monthly data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthSummaries = summaries.filter(s => {
        const summaryDate = new Date(s.createdAt);
        return summaryDate >= date && summaryDate <= monthEnd;
      });
      
      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        summaries: monthSummaries.length,
        timeSaved: monthSummaries.reduce((total, s) => total + calculateTimeSaved(s), 0),
        avgWordsReduced: monthSummaries.length > 0 ? 
          monthSummaries.reduce((total, s) => total + 300, 0) / monthSummaries.length : 0
      });
    }

    // Calculate productivity score
    const recentActivity = summaries.filter(s => 
      new Date(s.createdAt) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const consistencyScore = Math.min(streakDays * 10, 40);
    const activityScore = Math.min(recentActivity * 10, 40);
    const categoryDiversityScore = Math.min(topCategories.length * 5, 20);
    const productivityScore = consistencyScore + activityScore + categoryDiversityScore;

    const metrics = {
      totalTimeSaved: Math.round(totalTimeSaved),
      totalSummaries: summaries.length,
      averageReadingTimeReduction: summaries.length > 0 ? Math.round(75 + (summaries.length * 2)) : 0, // Estimated
      weeklyTimeSaved: Math.round(weeklyTimeSaved),
      monthlyTimeSaved: Math.round(monthlyTimeSaved),
      productivityScore: Math.min(productivityScore, 100),
      streakDays,
      topCategories,
      weeklyData,
      monthlyData
    };

    console.log(`[Analytics Metrics] Successfully calculated metrics for ${userId}`);
    
    return new NextResponse(JSON.stringify(metrics), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[Analytics Metrics] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}