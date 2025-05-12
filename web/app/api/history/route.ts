import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma"; // Trying alternative path

export async function GET(request: Request) {
  // Get auth data outside try block
  const { userId } = auth(); 

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Fetch history for the logged-in user
    const history = await db.summaryHistory.findMany({
      where: {
        userId: userId, 
      },
      orderBy: {
        createdAt: 'desc', 
      },
      take: 50 
    });

    return NextResponse.json(history);

  } catch (error) {
    console.error("[API_HISTORY_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 