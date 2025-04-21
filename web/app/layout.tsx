import type React from "react"
import "./globals.css"
import { Lexend } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ClerkProvider } from '@clerk/nextjs'
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ChromeTokenHelper } from "@/components/chrome-token-helper"
import { cn } from "@/lib/utils"

const lexend = Lexend({ subsets: ["latin"] })

export const metadata = {
  title: "Tildra - AI-Powered Article Summarizer",
  description: "Get the essence of articles in seconds with AI-generated summaries and key points",
  icons: {
    icon: [
      {
        url: "/images/logo.png",
        href: "/images/logo.png",
      },
    ],
  },
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const defaultOpen = true;

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={lexend.className}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <ChromeTokenHelper />
            <SidebarProvider defaultOpen={defaultOpen}>
              <div className="flex w-full min-h-screen">
                <AppSidebar />
                <main
                  className={cn(
                    "flex-1 flex flex-col overflow-auto transition-all duration-200 ease-linear"
                  )}
                >
                  {children}
                </main>
              </div>
            </SidebarProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
