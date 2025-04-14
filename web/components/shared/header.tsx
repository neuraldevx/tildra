"use client"

import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import Link from "next/link"
import { Menu } from "lucide-react"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar-fixed"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-background border-b border-border/40 sticky top-0 z-30">
      <div className="container mx-auto h-14 flex items-center px-4">
        {/* Desktop sidebar toggle - hidden on mobile */}
        <div className="hidden md:flex mr-3">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="h-[1.2rem] w-[1.2rem]" />
          </SidebarTrigger>
        </div>

        {/* Mobile menu trigger - only visible on mobile */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle mobile menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            <div className="flex flex-col h-full">
              <div className="h-14 flex items-center px-4 border-b">
                <Logo size="sm" />
                <span className="ml-2 font-semibold">Tildra</span>
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
                  href="/#how-it-works"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  How It Works
                </Link>
                <Link
                  href="/#features"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="/summarizer"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Summarizer
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href="/#use-cases"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Use Cases
                </Link>
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        <div className="mr-6 flex items-center">
          <Logo size="sm" animated={true} href="/" />
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/#how-it-works" className="text-foreground/60 hover:text-foreground/80 transition-colors">
            How It Works
          </Link>
          <Link href="/#features" className="text-foreground/60 hover:text-foreground/80 transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="text-foreground/60 hover:text-foreground/80 transition-colors">
            Pricing
          </Link>
          <Link href="/#use-cases" className="text-foreground/60 hover:text-foreground/80 transition-colors">
            Use Cases
          </Link>
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-4">
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
