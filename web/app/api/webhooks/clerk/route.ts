import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// --- Import the singleton Prisma Client instance ---
import { prisma } from '@/lib/prisma';
// ----------------------------------------------------

export async function POST(req: Request) {
  // Get the necessary secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set in environment variables.');
    return new NextResponse('Internal Server Error: Webhook secret not configured', { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Error: Missing Svix headers');
    return new NextResponse('Error occurred -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  // Note: It's crucial to read the raw body for verification, not the parsed JSON
  const payload = await req.json();
  const body = JSON.stringify(payload); // Use stringified payload for verification

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err: any) {
    console.error('Error verifying webhook:', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, {
      status: 400
    });
  }

  // Extract the event type
  const eventType = evt.type;
  console.log(`Received webhook event: ${eventType}`);

  // --- Handle the user.created event ---
  if (eventType === 'user.created') {
    const { id: clerkId, email_addresses, first_name, last_name, image_url } = evt.data;

    if (!clerkId) {
        console.error('Webhook Error: clerkId missing in user.created event');
        return new NextResponse('Bad Request: Missing user ID', { status: 400 });
    }

    const primaryEmail = email_addresses[0]?.email_address;

    if (!primaryEmail) {
        console.error(`Webhook Error: Primary email missing for clerkId: ${clerkId}`);
        return new NextResponse('Bad Request: Missing primary email', { status: 400 });
    }

    try {
      console.log(`Attempting to create user in DB for Clerk ID: ${clerkId}`);
      // Use Prisma Client to create the user
      const newUser = await prisma.user.create({
        data: {
          clerkId: clerkId,
          email: primaryEmail,
          // Add other fields if needed and available in webhook, e.g.:
          // firstName: first_name,
          // lastName: last_name,
          // imageUrl: image_url,
        },
      });
      console.log(`Successfully created user ${newUser.id} in DB for Clerk ID: ${clerkId}`);
      return new NextResponse('User created successfully', { status: 201 });

    } catch (error: any) {
      // Check if the error is because the user already exists (unique constraint violation)
      if (error.code === 'P2002') { // Prisma unique constraint error code
        console.warn(`Webhook Warning: User with clerkId ${clerkId} or email ${primaryEmail} already exists.`);
        return new NextResponse('User already exists', { status: 200 }); // Use 200 to prevent Clerk from retrying
      } else {
        console.error(`Error creating user in DB for clerkId ${clerkId}:`, error);
        return new NextResponse('Internal Server Error creating user', { status: 500 });
      }
    }
  }

  // --- Handle user.updated event (Optional but good practice) ---
  else if (eventType === 'user.updated') {
    const { id: clerkId, email_addresses, first_name, last_name, image_url } = evt.data;
    const primaryEmail = email_addresses[0]?.email_address;

    if (!clerkId || !primaryEmail) {
        console.error('Webhook Error: clerkId or primary email missing in user.updated event');
        return new NextResponse('Bad Request: Missing user ID or email', { status: 400 });
    }

     try {
      console.log(`Attempting to update user in DB for Clerk ID: ${clerkId}`);
      const updatedUser = await prisma.user.update({
        where: { clerkId: clerkId },
        data: {
          email: primaryEmail, // Update email in case it changed
          // Update other fields if needed:
          // firstName: first_name,
          // lastName: last_name,
          // imageUrl: image_url,
        },
      });
      console.log(`Successfully updated user ${updatedUser.id} in DB for Clerk ID: ${clerkId}`);
      return new NextResponse('User updated successfully', { status: 200 });
    } catch (error: any) {
        // Handle case where user might not exist in DB yet (e.g., if created webhook failed)
         if (error.code === 'P2025') { // Prisma Record not found error code
            console.warn(`Webhook Warning: User with clerkId ${clerkId} not found for update.`);
             return new NextResponse('User not found', { status: 404 });
         } else {
             console.error(`Error updating user in DB for clerkId ${clerkId}:`, error);
             return new NextResponse('Internal Server Error updating user', { status: 500 });
         }
    }
  }

  // --- Handle user.deleted event (Optional but recommended) ---
    else if (eventType === 'user.deleted') {
        const { id: clerkId, deleted } = evt.data;

        // Check if deletion is permanent or soft
        if (!deleted) {
             console.log(`User ${clerkId} marked as deleted in Clerk, but not permanently removed. Skipping DB deletion.`);
             return new NextResponse('User soft deleted, no DB action', { status: 200 });
        }

        if (!clerkId) {
            console.error('Webhook Error: clerkId missing in user.deleted event');
            return new NextResponse('Bad Request: Missing user ID', { status: 400 });
        }

        try {
            console.log(`Attempting to delete user in DB for Clerk ID: ${clerkId}`);
            await prisma.user.delete({
                where: { clerkId: clerkId },
            });
            console.log(`Successfully deleted user in DB for Clerk ID: ${clerkId}`);
            return new NextResponse('User deleted successfully', { status: 200 });
        } catch (error: any) {
            if (error.code === 'P2025') { // Prisma Record not found error code
                console.warn(`Webhook Warning: User with clerkId ${clerkId} not found for deletion.`);
                return new NextResponse('User not found', { status: 404 });
            } else {
                console.error(`Error deleting user in DB for clerkId ${clerkId}:`, error);
                return new NextResponse('Internal Server Error deleting user', { status: 500 });
            }
        }
    }

  // Acknowledge other event types
  else {
    console.log(`Webhook received, acknowledging unhandled event type: ${eventType}`);
  }

  // Respond to Clerk to acknowledge receipt of the webhook
  return new NextResponse('Webhook received', { status: 200 });
} 