import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { summary_id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[History API DELETE] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const summaryId = params.summary_id;

    console.log(`[History API DELETE] Deleting summary ${summaryId} for user ${userId}`);

    // First verify the summary exists and belongs to the user
    const existingSummary = await prisma.summaryHistory.findFirst({
      where: {
        id: summaryId,
        userId: userId
      }
    });

    if (!existingSummary) {
      return new NextResponse(JSON.stringify({ error: 'Summary not found' }), { status: 404 });
    }

    // Delete the summary
    await prisma.summaryHistory.delete({
      where: { id: summaryId }
    });

    console.log(`[History API DELETE] Successfully deleted summary ${summaryId} for ${userId}`);
    
    return new NextResponse(null, {
      status: 204
    });

  } catch (error) {
    console.error('[History API DELETE] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}