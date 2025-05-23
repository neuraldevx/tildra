"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FileText, Zap, Star, ArrowRight, Check } from "lucide-react"
import Link from "next/link"

interface Feature {
  name: string
  description: string
  included: boolean
}

interface PricingTier {
  name: string
  price: {
    monthly: number
    yearly?: number
  }
  description: string
  features: Feature[]
  highlight?: boolean
  badge?: string
  icon: React.ReactNode
  cta: string
  href: string
}

interface PricingSectionProps {
  tiers: PricingTier[]
  className?: string
}

function PricingSection({ tiers, className }: PricingSectionProps) {
  const buttonStyles = {
    default: cn(
      "h-12 bg-white dark:bg-zinc-900",
      "hover:bg-zinc-50 dark:hover:bg-zinc-800",
      "text-zinc-900 dark:text-zinc-100",
      "border border-zinc-200 dark:border-zinc-800",
      "hover:border-zinc-300 dark:hover:border-zinc-700",
      "shadow-sm hover:shadow-md",
      "text-sm font-medium",
    ),
    highlight: cn(
      "h-12 bg-primary",
      "hover:bg-primary/90",
      "text-primary-foreground",
      "shadow-[0_1px_15px_rgba(0,0,0,0.1)]",
      "hover:shadow-[0_1px_20px_rgba(0,0,0,0.15)]",
      "font-semibold text-base",
    ),
  }

  const badgeStyles = cn(
    "px-4 py-1.5 text-sm font-medium",
    "bg-primary",
    "text-primary-foreground",
    "border-none shadow-lg",
  )

  return (
    <section
      className={cn(
        "relative bg-background text-foreground",
        "py-12 px-4 md:py-24 lg:py-32",
        "overflow-hidden",
        className,
      )}
    >
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-4 mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Choose the plan that works best for you. Start with our free tier and upgrade anytime as your needs grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "relative group backdrop-blur-sm",
                "rounded-3xl transition-all duration-300",
                "flex flex-col",
                tier.highlight
                  ? "bg-gradient-to-b from-primary/10 to-transparent"
                  : "bg-card",
                "border",
                tier.highlight
                  ? "border-primary/50 shadow-xl"
                  : "border-border shadow-md",
                "hover:translate-y-0 hover:shadow-lg",
              )}
            >
              {tier.badge && tier.highlight && (
                <div className="absolute -top-4 left-6">
                  <Badge className={badgeStyles}>{tier.badge}</Badge>
                </div>
              )}

              <div className="p-8 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      tier.highlight
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tier.icon}
                  </div>
                  <h3 className="text-xl font-semibold">
                    {tier.name}
                  </h3>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    {tier.price.monthly === 0 ? (
                      <span className="text-4xl font-bold">
                        Free
                      </span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">
                          ${tier.price.monthly}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /month
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </div>

                <div className="space-y-4">
                  {tier.features.map((feature) => (
                    <div key={feature.name} className="flex gap-4">
                      <div
                        className={cn(
                          "mt-1 p-0.5 rounded-full transition-colors duration-200",
                          feature.included
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {feature.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {feature.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 pt-0 mt-auto">
                <Button
                  asChild
                  className={cn(
                    "w-full relative transition-all duration-300",
                    tier.highlight
                      ? buttonStyles.highlight
                      : buttonStyles.default,
                  )}
                >
                  <Link href={tier.href}>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {tier.cta}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">
              Trusted by over 10,000 users worldwide
            </span>
          </div>
          
          <p className="mt-6 text-sm text-muted-foreground max-w-2xl mx-auto">
            All plans include access to our web and mobile apps. Upgrade or downgrade anytime.
            <br />
            <span className="font-medium text-foreground">
              Limited time offer: Get 20% off Pro plan for the first 3 months!
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}

const pricingTiers: PricingTier[] = [
  {
    name: "Free",
    price: {
      monthly: 0,
    },
    description: "Perfect for casual users who need basic summaries",
    icon: (
      <div className="relative">
        <FileText className="w-7 h-7 relative z-10" />
      </div>
    ),
    cta: "Get started",
    href: "/dashboard",
    features: [
      {
        name: "5 Summaries per day",
        description: "Enough for most casual users",
        included: true,
      },
      {
        name: "Basic text analysis",
        description: "Get the key points from any text",
        included: true,
      },
      {
        name: "Web app access",
        description: "Use from any browser",
        included: true,
      },
      {
        name: "Priority support",
        description: "Get help when you need it",
        included: false,
      },
    ],
  },
  {
    name: "Pro",
    price: {
      monthly: 9,
    },
    description: "For power users who need unlimited access and advanced features",
    highlight: true,
    badge: "Most Popular",
    icon: (
      <div className="relative">
        <Zap className="w-7 h-7 relative z-10" />
      </div>
    ),
    cta: "Upgrade now",
    href: "/pricing",
    features: [
      {
        name: "Unlimited summaries",
        description: "No daily limits",
        included: true,
      },
      {
        name: "Advanced analysis",
        description: "Deeper insights and custom formats",
        included: true,
      },
      {
        name: "Priority support",
        description: "24/7 fast response times",
        included: true,
      },
      {
        name: "Advanced features",
        description: "Custom templates and export options",
        included: true,
      },
    ],
  },
]

export function PricingPreview() {
  return <PricingSection tiers={pricingTiers} />
} 