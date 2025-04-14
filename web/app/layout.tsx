import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ClerkProvider } from '@clerk/nextjs'
import { SidebarProvider } from "@/components/ui/sidebar-fixed"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

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
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SidebarProvider defaultOpen={true}>
              <div className="flex w-full">
                <AppSidebar />
                <main
                  className={cn(
                    "flex-1 flex flex-col overflow-auto transition-all duration-200 ease-linear"
                  )}
                  style={{ marginLeft: 'var(--main-content-margin-left)' }}
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
