import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[Analytics Insights] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log(`[Analytics Insights] Generating insights for user ${userId}`);

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
      // Return empty insights for users with no summaries
      return new NextResponse(JSON.stringify([]), { status: 200 });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate some basic metrics for insights
    const calculateTimeSaved = (summary: any) => {
      const originalLength = summary.title ? summary.title.length + (summary.url ? 500 : 0) : 500;
      const summaryLength = summary.tldr.length + (summary.keyPoints?.join(' ').length || 0);
      const wordsReduction = Math.max(originalLength - summaryLength, 0);
      return Math.max(wordsReduction / 250 * 60, 2); // Min 2 minutes saved
    };

    const totalTimeSaved = summaries.reduce((total, summary) => total + calculateTimeSaved(summary), 0);
    const weeklySummaries = summaries.filter(s => new Date(s.createdAt) >= oneWeekAgo);
    const weeklyTimeSaved = weeklySummaries.reduce((total, summary) => total + calculateTimeSaved(summary), 0);

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

    // Generate insights based on data
    const insights = [];

    // Time saved insight
    if (totalTimeSaved > 0) {
      const hours = Math.floor(totalTimeSaved / 60);
      const minutes = Math.round(totalTimeSaved % 60);
      
      if (totalTimeSaved > 120) {
        insights.push({
          type: 'time_saved',
          title: 'Outstanding Time Management',
          description: `You've saved ${hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`} through smart summarization! That's equivalent to ${Math.floor(totalTimeSaved / 25)} episodes of your favorite show.`,
          value: totalTimeSaved,
          trend: 'up',
          actionable: 'Consider sharing your productivity tips with colleagues or friends!',
          priority: 'high'
        });
      } else if (totalTimeSaved > 30) {
        insights.push({
          type: 'time_saved',
          title: 'Great Progress',
          description: `You've saved ${minutes}m so far! Every summary brings you closer to reclaiming more of your valuable time.`,
          value: totalTimeSaved,
          trend: 'stable',
          actionable: 'Try summarizing 2-3 more articles this week to boost your time savings.',
          priority: 'medium'
        });
      } else {
        insights.push({
          type: 'efficiency_tip',
          title: 'Getting Started',
          description: `You've saved ${minutes}m - that's a great start! Consistent usage will unlock even greater time savings.`,
          value: totalTimeSaved,
          trend: 'stable',
          actionable: 'Aim for summarizing 1-2 articles daily to build a productive routine.',
          priority: 'medium'
        });
      }
    }

    // Streak insights
    if (streakDays >= 7) {
      insights.push({
        type: 'milestone',
        title: 'Consistency Champion! 🔥',
        description: `Amazing! You've maintained a ${streakDays}-day streak. Consistency is the key to building lasting productive habits.`,
        value: streakDays,
        trend: 'up',
        actionable: 'Set a goal to reach a 30-day streak for maximum habit formation!',
        priority: 'high'
      });
    } else if (streakDays >= 3) {
      insights.push({
        type: 'goal_progress',
        title: 'Building Momentum',
        description: `You're on a ${streakDays}-day streak! You're developing great summarization habits.`,
        value: streakDays,
        trend: 'up',
        actionable: 'Keep going! Try to reach a 7-day streak to establish a strong routine.',
        priority: 'medium'
      });
    } else if (streakDays === 1) {
      insights.push({
        type: 'efficiency_tip',
        title: 'Daily Habit Formation',
        description: 'You used Tildra today! Building daily habits is the most effective way to maximize productivity.',
        value: 1,
        actionable: 'Try to use Tildra again tomorrow to start building a consistent routine.',
        priority: 'medium'
      });
    }

    // Weekly performance insight
    if (weeklySummaries.length > 0) {
      if (weeklyTimeSaved > 60) {
        insights.push({
          type: 'productivity_trend',
          title: 'Excellent Weekly Performance',
          description: `This week you've saved ${Math.floor(weeklyTimeSaved / 60) > 0 ? `${Math.floor(weeklyTimeSaved / 60)}h ${Math.round(weeklyTimeSaved % 60)}m` : `${Math.round(weeklyTimeSaved)}m`} across ${weeklySummaries.length} summaries. You're in the top tier of productive users!`,
          value: weeklyTimeSaved,
          trend: 'up',
          actionable: 'Share your success with others or consider upgrading to unlock advanced features.',
          priority: 'high'
        });
      } else if (weeklySummaries.length >= 3) {
        insights.push({
          type: 'productivity_trend',
          title: 'Steady Weekly Progress',
          description: `You've created ${weeklySummaries.length} summaries this week, saving ${Math.round(weeklyTimeSaved)}m of reading time.`,
          value: weeklySummaries.length,
          trend: 'stable',
          actionable: 'Try to aim for longer or more complex articles to maximize your time savings.',
          priority: 'medium'
        });
      }
    }

    // Category diversity insight
    const categoryMap: Record<string, number> = {};
    summaries.forEach(summary => {
      let category = 'general';
      if (summary.url) {
        try {
          const domain = new URL(summary.url).hostname;
          if (domain.includes('github')) category = 'technical';
          else if (domain.includes('medium') || domain.includes('blog')) category = 'articles';
          else if (domain.includes('news')) category = 'news';
          else if (domain.includes('wiki')) category = 'research';
          else category = 'web';
        } catch {
          category = 'general';
        }
      }
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });

    const categoryCount = Object.keys(categoryMap).length;
    const topCategory = Object.entries(categoryMap).sort(([,a], [,b]) => b - a)[0];

    if (categoryCount >= 4) {
      insights.push({
        type: 'efficiency_tip',
        title: 'Knowledge Explorer',
        description: `You've summarized content from ${categoryCount} different categories! This diverse approach broadens your knowledge base effectively.`,
        value: categoryCount,
        actionable: 'Continue exploring diverse topics to maintain well-rounded knowledge acquisition.',
        priority: 'low'
      });
    } else if (topCategory && topCategory[1] >= 3) {
      insights.push({
        type: 'efficiency_tip',
        title: `${topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1)} Specialist`,
        description: `You've focused heavily on ${topCategory[0]} content with ${topCategory[1]} summaries. Deep diving builds expertise!`,
        value: topCategory[1],
        actionable: 'Consider exploring other categories occasionally to maintain knowledge diversity.',
        priority: 'low'
      });
    }

    // Productivity score calculation and insight
    const recentActivity = weeklySummaries.length;
    const consistencyScore = Math.min(streakDays * 10, 40);
    const activityScore = Math.min(recentActivity * 10, 40);
    const categoryDiversityScore = Math.min(categoryCount * 5, 20);
    const productivityScore = consistencyScore + activityScore + categoryDiversityScore;

    if (productivityScore >= 80) {
      insights.push({
        type: 'milestone',
        title: 'Productivity Excellence!',
        description: `Your productivity score is ${Math.min(productivityScore, 100)}! You're among the most effective Tildra users.`,
        value: Math.min(productivityScore, 100),
        trend: 'up',
        actionable: 'You\'re doing amazing! Consider mentoring others or exploring advanced productivity techniques.',
        priority: 'high'
      });
    } else if (productivityScore < 30 && summaries.length >= 3) {
      insights.push({
        type: 'efficiency_tip',
        title: 'Optimization Opportunity',
        description: 'Your productivity score has room for improvement. Focus on consistency and variety in your summaries.',
        value: productivityScore,
        trend: 'stable',
        actionable: 'Try to use Tildra daily and explore different types of content to boost your score.',
        priority: 'medium'
      });
    }

    console.log(`[Analytics Insights] Generated ${insights.length} insights for ${userId}`);
    
    return new NextResponse(JSON.stringify(insights), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[Analytics Insights] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}