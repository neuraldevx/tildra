'use client'

import { useState } from 'react'
import Link from "next/link"
import { UserButton, useAuth, SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs"
import { Sparkles, Settings, Loader2 } from "lucide-react"

import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"

interface LandingHeaderProps {
  isProUser: boolean;
}

export function LandingHeader({ isProUser }: LandingHeaderProps) {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      // Fetch the proxy API route
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session.');
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Portal URL not received.');
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingPortal(false);
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-20">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo linking to home */}
        <Logo size="sm" animated={true} href="/" />

        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
                <Button variant="ghost" size="sm">Log In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
                <Button size="sm">Sign Up</Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            {isProUser ? (
              // Pro User: Show Manage button
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="flex items-center gap-1.5 text-sm"
              >
                {isLoadingPortal ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Settings size={14} />
                )}
                Manage Subscription
              </Button>
            ) : (
              // Free User: Show Upgrade button
              <Link href="/pricing">
                <Button variant="default" size="sm" className="flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Upgrade to Premium
                </Button>
              </Link>
            )}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
} 