import type React from "react"
import "./globals.css"
import { Lexend } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ClerkProvider } from '@clerk/nextjs'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { ChromeTokenHelper } from "@/components/chrome-token-helper"
import { MainContent } from "@/components/main-content"
import { Header } from "@/components/shared/header"

const lexend = Lexend({ subsets: ["latin"] })

export const metadata = {
  title: "Tildra - AI-Powered Article Summarizer",
  description: "Get the essence of articles in seconds with AI-generated summaries and key points",
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
        <body className={lexend.className}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <ChromeTokenHelper />
            <SidebarProvider>
              <div className="flex flex-col w-full min-h-screen">
                <Header />
                <div className="flex flex-1">
                  <AppSidebar />
                  <MainContent>
                    {children}
                  </MainContent>
                </div>
              </div>
            </SidebarProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
