"use client"

import { ThemeToggle } from "@/components/ui/theme-toggle"
import Link from "next/link"
import { Menu } from "lucide-react"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { useUserStatus } from "@/app/hooks/useUserStatus"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isPro, loading: statusLoading } = useUserStatus();

  return (
    <header className="bg-background border-b border-border/40 sticky top-0 z-30">
      <div className="h-16 flex items-center justify-between p-4 relative">
        {/* Mobile menu trigger - only visible on mobile */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle mobile menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            <div className="flex flex-col h-full">
              <div className="h-16 flex items-center px-5 border-b">
                <span className="text-lg font-semibold">Navigation</span>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/#features"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="/#about"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  href="/#why-choose"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Why Choose Us
                </Link>
                <Link
                  href="/summarizer"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Summarizer
                </Link>
                {!isPro && (
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
                )}
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Spacer for mobile button - hidden on desktop */}
        <div className="md:hidden"></div>

        {/* Center Navigation - absolutely centered */}
        <nav className="hidden md:flex items-center justify-center space-x-6 text-sm font-medium absolute left-1/2 transform -translate-x-1/2">
          <Link href="/#features" className="text-foreground/60 hover:text-foreground/80 transition-colors">
            Features
          </Link>
          <Link href="/#about" className="text-foreground/60 hover:text-foreground/80 transition-colors">
            About
          </Link>
          <Link href="/#testimonials" className="text-foreground/60 hover:text-foreground/80 transition-colors">
            Testimonials
          </Link>
          {!isPro && (
          <Link href="/pricing" className="text-foreground/60 hover:text-foreground/80 transition-colors">
            Pricing
          </Link>
          )}
        </nav>

        {/* Right side: Auth & Theme */}
        <div className="flex items-center space-x-4">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign up</Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
            {!statusLoading && isPro && (
              <span className="pro-badge-animated ml-1">
                <span>PRO</span>
              </span>
            )}
          </SignedIn>
          <Link href="/summarizer">
            <Button variant="secondary" size="sm">Try Now</Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
