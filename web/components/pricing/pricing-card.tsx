"use client"
import { Check, X, Minus } from "lucide-react"
import Link from "next/link"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PricingFeature {
  name: string
  included: boolean
  upgraded?: string
}

interface PricingCardProps {
  title: string
  price: string
  pricePeriod?: string
  yearlyPrice?: string
  description: string
  features: PricingFeature[]
  ctaText: string
  ctaLink: string
  isPrimary?: boolean
  popularBadge?: boolean
  billingCycle: 'monthly' | 'yearly';
  ctaDisabled?: boolean
}

const PRODUCTION_API_URL = 'https://snipsummary.fly.dev';

export function PricingCard({
  title,
  price,
  pricePeriod = "",
  yearlyPrice,
  description,
  features,
  ctaText,
  ctaLink,
  isPrimary = false,
  popularBadge = false,
  billingCycle,
  ctaDisabled
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { getToken } = useAuth();

  const handleUpgradeClick = async () => {
    if (!isPrimary || ctaDisabled) return;

    setIsLoading(true);
    const priceLookupKey = billingCycle;

    try {
      const token = await getToken();
      if (!token) {
        router.push('/sign-in');
        setIsLoading(false);
        return;
      }

      const apiBaseUrl = PRODUCTION_API_URL;
      console.log(`[Upgrade] Fetching: POST ${apiBaseUrl}/create-checkout-session`);
      const response = await fetch(`${apiBaseUrl}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ price_lookup_key: priceLookupKey }),
      });
      
      console.log(`[Upgrade] Response Status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to create checkout session.' }));
        console.error('[Upgrade] Response not OK:', errorData);
        throw new Error(errorData.detail || `HTTP error ${response.status}`);
      }

      let responseData;
      try {
          responseData = await response.json();
          console.log('[Upgrade] Parsed Response Data:', responseData);
      } catch (parseError) {
          console.error('[Upgrade] Failed to parse JSON response:', parseError);
          throw new Error('Failed to understand server response.');
      }

      const checkoutUrl = responseData?.url;
      console.log('[Upgrade] Extracted Checkout URL:', checkoutUrl);

      if (checkoutUrl) {
        console.log('[Upgrade] Redirecting to:', checkoutUrl);
        window.location.href = checkoutUrl;
      } else {
        console.error('[Upgrade] Checkout URL not found in response data.');
        throw new Error('Checkout URL not received from server.');
      }

    } catch (error) {
      console.error("[Upgrade] Error in handleUpgradeClick:", error);
      alert(`Error creating checkout session: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "border rounded-xl p-6 flex flex-col h-full relative",
        isPrimary ? "border-primary/50 bg-primary/5" : "border-border bg-card"
      )}
    >
      {popularBadge && (
        <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs font-semibold">
          Most Popular
        </span>
      )}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-foreground/70 mb-4 text-sm min-h-[40px]">{description}</p>
      
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        {pricePeriod && <span className="text-foreground/70 text-sm">/{pricePeriod}</span>}
        {billingCycle === "yearly" && yearlyPrice && 
            <p className="text-xs text-foreground/60 mt-1">{yearlyPrice} billed annually</p>
        }
      </div>

      <ul className="space-y-3 mb-8 flex-grow text-sm">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            {feature.included ? (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className={cn(!feature.included && "text-muted-foreground line-through")}>
              {feature.name}
            </span>
            {feature.included && feature.upgraded && billingCycle === "monthly" && (
              <span className="text-xs text-primary/80 ml-auto pl-2">
                (Upgrade: {feature.upgraded})
              </span>
            )}
          </li>
        ))}
      </ul>

      <Button 
        asChild={!ctaDisabled && !!ctaLink && !isPrimary}
        variant={isPrimary ? "default" : "outline"} 
        className="w-full mt-auto" 
        disabled={ctaDisabled || isLoading}
        onClick={isPrimary && !ctaDisabled ? handleUpgradeClick : undefined}
      >
        {isLoading && isPrimary ? (
            <span>Processing...</span>
        ) : ctaDisabled || (!ctaLink && !isPrimary) ? (
          <span>{ctaText}</span>
        ) : isPrimary ? (
            <span>{ctaText}</span>
        ) : (
          <Link href={ctaLink}>{ctaText}</Link>
        )}
      </Button>
    </div>
  )
}
