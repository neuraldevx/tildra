"use client"
import { Check, X } from "lucide-react"
import Link from "next/link"

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
}

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
}: PricingCardProps) {
  return (
    <div
      className={`relative h-full rounded-xl border-2 ${
        isPrimary ? "border-primary/30" : "border-border"
      } overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1`}
    >
      {popularBadge && (
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
            MOST POPULAR
          </div>
        </div>
      )}

      <div className="p-6 md:p-8">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <div className="mb-4">
          <span className="text-4xl font-bold">{price}</span>
          {pricePeriod && <span className="text-foreground/60 ml-1">/{pricePeriod}</span>}
          {yearlyPrice && <div className="text-sm text-foreground/60 mt-1">{yearlyPrice}</div>}
        </div>
        <p className="text-foreground/70 mb-6">{description}</p>

        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              {feature.included ? (
                <>
                  <div className="bg-primary/20 text-primary rounded-full p-1 mt-0.5 flex-shrink-0">
                    <Check size={14} />
                  </div>
                  <span className={feature.upgraded ? "line-through text-foreground/50" : ""}>{feature.name}</span>
                  {feature.upgraded && <span className="text-primary font-medium ml-1">{feature.upgraded}</span>}
                </>
              ) : (
                <>
                  <div className="bg-muted text-muted-foreground rounded-full p-1 mt-0.5 flex-shrink-0">
                    <X size={14} />
                  </div>
                  <span className="text-foreground/50">{feature.name}</span>
                </>
              )}
            </li>
          ))}
        </ul>

        <Link
          href={ctaLink}
          className={`w-full flex justify-center py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
            isPrimary
              ? "gradient-button ripple button-glow"
              : "border-2 border-border hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          {ctaText}
        </Link>
      </div>
    </div>
  )
}
