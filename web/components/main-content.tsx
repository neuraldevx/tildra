"use client"

import React from 'react'
import { useSidebar } from '@/components/sidebar-context'
import { cn } from '@/lib/utils'

interface MainContentProps {
  children: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
  const { isOpen } = useSidebar()

  return (
    <main className={cn(
      "flex-1 transition-all duration-300 ease-in-out",
      // On desktop, add left margin when sidebar is open
      "md:ml-0",
      isOpen && "md:ml-64"
    )}>
      {children}
    </main>
  )
} 