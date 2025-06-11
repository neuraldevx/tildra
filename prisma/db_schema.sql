generator client {
  provider = "prisma-client-py"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id                     String           @id @default(uuid())
  clerkId                String           @unique
  email                  String           @unique
  firstName              String?
  lastName               String?
  createdAt              DateTime         @default(now())
  updatedAt              DateTime         @updatedAt
  plan                   String           @default("free")
  summariesUsed          Int              @default(0)
  summaryLimit           Int              @default(5)
  usageResetAt           DateTime         @default(now()) @map("usageResetAt")
  stripeCustomerId       String?          @unique
  stripeSubscriptionId   String?          @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
  profileImageUrl        String?
  totalSummariesMade     Int              @default(0)
  emailNotifications     Boolean?         @default(true)
  summaryNotifications   Boolean?         @default(true)
  marketingEmails        Boolean?         @default(false)
  summaryHistory         SummaryHistory[]

  @@map("users")
}

model SummaryHistory {
  id        String   @id @default(uuid())
  userId    String
  url       String?
  title     String?
  tldr      String
  keyPoints String[] @default([]) @map("key_points")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [clerkId])

  @@index([userId])
  @@map("summary_history")
}


