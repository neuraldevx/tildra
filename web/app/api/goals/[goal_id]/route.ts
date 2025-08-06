import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { goal_id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[Goals API PUT] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const goalId = params.goal_id;
    const body = await request.json();

    console.log(`[Goals API PUT] Updating goal ${goalId} for user ${userId}`);

    // First verify the goal exists and belongs to the user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: userId
      }
    });

    if (!existingGoal) {
      return new NextResponse(JSON.stringify({ error: 'Goal not found' }), { status: 404 });
    }

    // Update the goal with provided fields
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(body.target !== undefined && { target: parseInt(body.target) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date()
      }
    });

    console.log(`[Goals API PUT] Successfully updated goal ${goalId} for ${userId}`);
    
    return new NextResponse(JSON.stringify(updatedGoal), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[Goals API PUT] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { goal_id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('[Goals API DELETE] User not authenticated.');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const goalId = params.goal_id;

    console.log(`[Goals API DELETE] Deleting goal ${goalId} for user ${userId}`);

    // First verify the goal exists and belongs to the user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: userId
      }
    });

    if (!existingGoal) {
      return new NextResponse(JSON.stringify({ error: 'Goal not found' }), { status: 404 });
    }

    // Delete the goal
    await prisma.goal.delete({
      where: { id: goalId }
    });

    console.log(`[Goals API DELETE] Successfully deleted goal ${goalId} for ${userId}`);
    
    return new NextResponse(null, {
      status: 204
    });

  } catch (error) {
    console.error('[Goals API DELETE] Unexpected error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}