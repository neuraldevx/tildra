import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Tildra - AI-Powered Article Summarizer",
  description: "Get the essence of articles in seconds with AI-generated summaries and key points",
  icons: {
    icon: "/images/icon128.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-end">
                    <div className="flex items-center gap-4">
                        <SignedOut>
                          <SignInButton mode="modal" />
                          <SignUpButton mode="modal" />
                        </SignedOut>
                        <SignedIn>
                          <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                    </div>
                </div>
            </header>
            <main>{children}</main>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}