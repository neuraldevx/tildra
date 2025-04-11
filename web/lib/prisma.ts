import { PrismaClient } from '@prisma/client'

// Declare a global variable to hold the Prisma Client instance
declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Check if we're in production or if the global prisma instance exists
// In development, Next.js hot-reloading can create multiple instances
// We use the global variable to reuse the instance across reloads
export const prisma = globalThis.prisma || new PrismaClient()

// If we're not in production, assign the instance to the global variable
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
} 