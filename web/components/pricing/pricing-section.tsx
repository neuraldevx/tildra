"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { HelpCircle, CreditCard, Shield } from "lucide-react"
import { PricingCard } from "./pricing-card"
import { PricingToggle } from "./pricing-toggle"
import { PricingFaq } from "./pricing-faq"

// **Placeholder:** Fetch user status (replace with actual data fetching logic)
// This might come from a global context/store in a real app
async function getUserStatusData() {
  console.log("[Pricing] Fetching user status (placeholder)");
  // return { is_pro: false }; 
   return { is_pro: true }; // Example: User is Pro
}

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [isProUser, setIsProUser] = useState(false); // Add state for user status
  const [isLoadingStatus, setIsLoadingStatus] = useState(true); // Loading state

  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  // Fetch user status on component mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingStatus(true);
    getUserStatusData().then(data => {
      if (isMounted) {
        setIsProUser(data.is_pro);
        setIsLoadingStatus(false);
      }
    }).catch(err => {
        console.error("Failed to fetch user status:", err);
        if (isMounted) setIsLoadingStatus(false); // Still stop loading on error
    });
    return () => { isMounted = false; }; // Cleanup function
  }, []);

  const monthlyPrice = 15 // Set base monthly price
  const yearlyMonthlyPrice = 12 // Equivalent monthly price when paying yearly
  const premiumPrice = billingCycle === "monthly" ? monthlyPrice : yearlyMonthlyPrice
  const yearlyPrice = yearlyMonthlyPrice * 12
  const yearlyDiscount = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  const freeFeatures = [
    { name: "5 Summaries per Day", included: true },
    { name: "Standard AI Model", included: true },
    { name: "Browser Extension Access", included: true },
    { name: "Community Support", included: true },
    { name: "Advanced AI Model", included: false },
    { name: "Priority Email Support", included: false },
    { name: "Unlimited Summaries", included: false },
  ]

  const premiumFeatures = [
    { name: "5 Summaries per Day", included: true, upgraded: "Unlimited Summaries" },
    { name: "Standard AI Model", included: true, upgraded: "Advanced AI Model" },
    { name: "Browser Extension Access", included: true },
    { name: "Community Support", included: true, upgraded: "Priority Email Support" },
    { name: "Different Summary Styles", included: true },
    { name: "Export Options", included: true },
    { name: "API Access", included: true },
  ]

  // Determine CTA text/link/state for Premium card based on status
  let premiumCtaText = "Upgrade Now";
  let premiumCtaLink = "#"; // Replace with actual checkout link/handler
  let premiumCtaDisabled = false;

  if (isLoadingStatus) {
    premiumCtaText = "Loading...";
    premiumCtaDisabled = true;
  } else if (isProUser) {
    premiumCtaText = "Current Plan";
    premiumCtaDisabled = true; // Disable button for current plan
    premiumCtaLink = ""; // No link needed
  }

  return (
    <section id="pricing" className="container mx-auto px-4 py-20 relative z-10" ref={ref}>
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your SnipSummary Plan</h2>
        <p className="text-foreground/70 max-w-2xl mx-auto">
          Start summarizing in seconds, upgrade for unlimited power.
        </p>
      </motion.div>

      <PricingToggle billingCycle={billingCycle} onChange={setBillingCycle} yearlyDiscount={yearlyDiscount} />

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-8"
        variants={container}
        initial="hidden"
        animate={isInView ? "show" : "hidden"}
      >
        <motion.div variants={item}>
          <PricingCard
            title="Free"
            price="$0"
            description="Perfect for getting started"
            features={freeFeatures}
            ctaText="Get Started Free"
            ctaLink="#"
            isPrimary={false}
            billingCycle={billingCycle}
          />
        </motion.div>

        <motion.div variants={item}>
          <PricingCard
            title="Premium"
            price={`$${premiumPrice}`}
            pricePeriod={billingCycle === "monthly" ? "month" : "month, billed annually"}
            description="Unlock unlimited potential"
            features={premiumFeatures}
            ctaText={premiumCtaText}
            ctaLink={premiumCtaLink}
            ctaDisabled={premiumCtaDisabled}
            isPrimary={!isProUser}
            popularBadge={!isProUser}
            yearlyPrice={billingCycle === "yearly" ? `$${yearlyPrice}/year` : undefined}
            billingCycle={billingCycle}
          />
        </motion.div>
      </motion.div>

      <div className="max-w-3xl mx-auto mt-20">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-2xl font-bold mb-2">Frequently Asked Questions</h3>
          <p className="text-foreground/70">Everything you need to know about our plans and pricing.</p>
        </motion.div>

        <PricingFaq />

        <motion.div
          className="flex flex-col md:flex-row items-center justify-center gap-6 mt-12 p-6 bg-card rounded-xl border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="flex items-center gap-3">
            <Shield className="text-primary h-6 w-6" />
            <span className="text-sm">Secure payments powered by Stripe</span>
          </div>
          <div className="h-6 w-px bg-border hidden md:block"></div>
          <div className="flex items-center gap-3">
            <CreditCard className="text-primary h-6 w-6" />
            <span className="text-sm">All major credit cards accepted</span>
          </div>
          <div className="h-6 w-px bg-border hidden md:block"></div>
          <div className="flex items-center gap-3">
            <HelpCircle className="text-primary h-6 w-6" />
            <span className="text-sm">30-day satisfaction guarantee</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
