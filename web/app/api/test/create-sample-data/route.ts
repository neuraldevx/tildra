import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log(`[Test API] Creating sample data for user ${userId}`);

    // Check if user exists, if not create them
    let user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          plan: 'free',
          summariesUsed: 0,
          summaryLimit: 10,
          totalSummariesMade: 0
        }
      });
      console.log(`[Test API] Created user for ${userId}`);
    }

    // Create sample summary history
    const sampleSummaries = [
      {
        userId: userId,
        url: 'https://techcrunch.com/ai-breakthrough-2024',
        title: 'Major AI Breakthrough Announced in 2024',
        tldr: 'Researchers have announced a significant breakthrough in artificial intelligence that could revolutionize how we interact with machines. The new model shows unprecedented accuracy in understanding context and generating human-like responses.',
        keyPoints: [
          'New AI model achieves 95% accuracy in context understanding',
          'Breakthrough could lead to more natural human-computer interaction',
          'Technology expected to be available commercially within 2 years',
          'Researchers from multiple institutions collaborated on the project'
        ],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        userId: userId,
        url: 'https://github.com/example/new-framework',
        title: 'Revolutionary Web Framework Launched',
        tldr: 'A new web development framework promises to simplify full-stack development with unprecedented ease of use. The framework combines the best features of React, Node.js, and modern database technologies.',
        keyPoints: [
          'Framework reduces boilerplate code by 70%',
          'Built-in TypeScript support and automatic type generation',
          'Seamless database integration with automatic migrations',
          'Growing community with over 10,000 GitHub stars'
        ],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        userId: userId,
        url: 'https://blog.medium.com/productivity-tips-remote-work',
        title: '10 Essential Productivity Tips for Remote Workers',
        tldr: 'Remote work productivity can be challenging without the right strategies. This comprehensive guide covers proven techniques to maintain focus, establish boundaries, and maximize efficiency while working from home.',
        keyPoints: [
          'Create a dedicated workspace to improve focus',
          'Use time-blocking techniques for better task management',
          'Take regular breaks to prevent burnout',
          'Establish clear communication protocols with your team',
          'Invest in quality tools and ergonomic equipment'
        ],
        createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        userId: userId,
        url: 'https://news.bbc.com/climate-change-report-2024',
        title: 'Latest Climate Change Report Shows Urgent Need for Action',
        tldr: 'The latest climate report reveals accelerating environmental changes and emphasizes the critical need for immediate global action. Scientists warn that we have a narrow window to prevent irreversible damage.',
        keyPoints: [
          'Global temperature rise exceeding previous projections',
          'Urgent need for renewable energy adoption',
          'Policy changes required at international level',
          'Individual actions can still make a significant impact'
        ],
        createdAt: new Date() // Today
      }
    ];

    // Insert sample summaries
    for (const summary of sampleSummaries) {
      await prisma.summaryHistory.create({ data: summary });
    }

    // Update user totals
    await prisma.user.update({
      where: { clerkId: userId },
      data: {
        totalSummariesMade: sampleSummaries.length,
        summariesUsed: sampleSummaries.length
      }
    });

    console.log(`[Test API] Created ${sampleSummaries.length} sample summaries for ${userId}`);

    return new NextResponse(JSON.stringify({ 
      message: 'Sample data created successfully',
      summariesCreated: sampleSummaries.length,
      userId: userId
    }), { status: 200 });

  } catch (error) {
    console.error('[Test API] Error creating sample data:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create sample data' }), { status: 500 });
  }
}