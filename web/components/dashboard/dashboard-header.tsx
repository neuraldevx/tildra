'use client'

import { useState } from 'react'
import Link from "next/link"
import { Sparkles, Settings, Loader2 } from "lucide-react"
import { useAuth } from "@clerk/nextjs"

import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"

interface DashboardHeaderProps {
  isProUser: boolean;
}

export function DashboardHeader({ isProUser }: DashboardHeaderProps) {
  const { getToken } = useAuth();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      // We fetch our *proxy* API route, not the backend directly
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        // No headers/body needed here as the proxy route handles auth
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session.');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Portal URL not received from server.');
      }

    } catch (error) {
      console.error("Error creating Stripe portal session:", error);
      alert(`Error managing subscription: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingPortal(false);
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-20">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Logo size="sm" animated={true} href="/" />
        <div className="flex items-center gap-4">
          {/* Conditionally render Upgrade link or Manage button */}
          {!isProUser ? (
            <Link
              href="/pricing"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Sparkles size={14} className="text-primary" />
              Upgrade to Premium
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className="hidden sm:flex items-center gap-1.5 text-sm"
            >
              {isLoadingPortal ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Settings size={14} />
              )}
              Manage Subscription
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
} 