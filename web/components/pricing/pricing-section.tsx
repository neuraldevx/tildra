"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { HelpCircle, CreditCard, Shield } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { PricingCard } from "./pricing-card"
import { PricingToggle } from "./pricing-toggle"
import { PricingFaq } from "./pricing-faq"

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [isProUser, setIsProUser] = useState(false); // Add state for user status
  const [isLoadingStatus, setIsLoadingStatus] = useState(true); // Loading state
  const { getToken, isSignedIn } = useAuth(); // Get Clerk auth methods

  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  // UseEffect to fetch real user status
  useEffect(() => {
    let isMounted = true;
    setIsLoadingStatus(true);

    const fetchStatus = async () => {
      if (!isSignedIn) {
        console.log("[Pricing Client] User not signed in.")
        if (isMounted) {
          setIsProUser(false);
          setIsLoadingStatus(false);
        }
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get session token.");
        }

        const baseApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://tildra.fly.dev'; // CHANGED: Add production fallback
        const apiUrl = `${baseApiUrl}/api/user/status`;
        console.log(`[Pricing Client] Fetching user status from ${apiUrl}`);

        // Add timeout for fetch requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

        try {
          const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorBody = await response.text(); // Get more details from error
            console.error(`[Pricing Client] API error ${response.status} (${response.statusText}): ${errorBody}`);
            // It's better to throw an error that includes the status and detailed message
            throw new Error(`API error fetching status (${response.status} ${response.statusText}): ${errorBody}`);
          }

          const data = await response.json();
          console.log("[Pricing Client] Received user status:", data);
          if (isMounted) {
            setIsProUser(data.is_pro);
            setIsLoadingStatus(false);
          }
        } catch (fetchErr) { // Catch errors specific to the fetch operation
          clearTimeout(timeoutId); // Clear timeout here as well
          console.warn("[Pricing Client] Fetch operation error:", fetchErr instanceof Error ? fetchErr.message : fetchErr);
          if (isMounted) {
            setIsProUser(false); // Assume not pro on fetch error
            setIsLoadingStatus(false);
          }
          // Optionally re-throw or handle: if (fetchErr.name === 'AbortError') { console.log('Fetch aborted due to timeout'); }
        }
      } catch (err) { // Catch outer errors (e.g., token, config)
        console.error("[Pricing Client] Failed to fetch user status (outer catch):", err instanceof Error ? err.message : err);
        if (isMounted) {
            setIsProUser(false); // Assume not pro on error
            setIsLoadingStatus(false); 
        }
      }
    };

    fetchStatus();

    return () => { isMounted = false; }; // Cleanup function
  }, [isSignedIn, getToken]); // Depend on isSignedIn and getToken

  const monthlyPrice = 10; // Set base monthly price to $10
  const yearlyDiscountPercentage = 0.20; // 20% discount for annual
  const yearlyMonthlyPrice = monthlyPrice * (1 - yearlyDiscountPercentage); // Equivalent monthly price when paying yearly
  const premiumPrice = billingCycle === "monthly" ? monthlyPrice : yearlyMonthlyPrice;
  const yearlyPrice = monthlyPrice * 12 * (1 - yearlyDiscountPercentage); // Total annual price
  const yearlyDiscountDisplay = Math.round(yearlyDiscountPercentage * 100);

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
    { name: "10 Summaries per Day", included: true },
    { name: "Standard AI Model", included: true },
    { name: "Browser Extension Access", included: true },
    { name: "Community Support", included: true },
    { name: "Advanced AI Model", included: false },
    { name: "Priority Email Support", included: false },
    { name: "Unlimited Summaries", included: false },
  ]

  const premiumFeatures = [
    { name: "Daily Summary Limit", included: true, upgraded: "500 Summaries per Month" },
    { name: "Standard AI Model", included: true, upgraded: "Advanced AI Model" },
    { name: "Browser Extension Access", included: true },
    { name: "Community Support", included: true, upgraded: "Priority Email Support" },
    { name: "Different Summary Styles", included: true },
    { name: "Export Options", included: true },
    { name: "API Access", included: true },
    { name: "Access to New Features", included: true },
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

  const plans = [
    {
      name: "Free",
      price: { monthly: 0, yearly: 0 },
      description: "Perfect for getting started",
      features: [
        { name: "10 Summaries per Day", included: true },
        { name: "Basic AI Summaries", included: true },
        { name: "Chrome Extension", included: true },
        { name: "Export Options", included: false },
        { name: "Priority Support", included: false },
        { name: "Advanced AI Models", included: false },
      ],
      buttonText: "Get Started",
      popular: false,
    },
    {
      name: "Premium",
      price: { monthly: 10, yearly: 96 },
      description: "For professionals and power users",
      features: [
        { name: "500 Summaries per Month", included: true },
        { name: "Advanced AI Models", included: true },
        { name: "Chrome Extension", included: true },
        { name: "Export Options", included: true },
        { name: "Priority Support", included: true },
        { name: "Summary History", included: true },
      ],
      buttonText: "Upgrade Now",
      popular: true,
    },
    {
      name: "Premium Plus",
      price: { monthly: 25, yearly: 240 },
      description: "For heavy users and teams",
      features: [
        { name: "1,500 Summaries per Month", included: true },
        { name: "Advanced AI Models", included: true },
        { name: "Chrome Extension", included: true },
        { name: "Export Options", included: true },
        { name: "Priority Support", included: true },
        { name: "Summary History", included: true },
        { name: "Team Management", included: true },
        { name: "API Access", included: true },
      ],
      buttonText: "Upgrade Now",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="container mx-auto px-4 py-20 relative z-10" ref={ref}>
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Tildra Plan</h2>
        <p className="text-foreground/70 max-w-2xl mx-auto">
          Start summarizing in seconds, upgrade for unlimited power.
        </p>
      </motion.div>

      <PricingToggle billingCycle={billingCycle} onChange={setBillingCycle} yearlyDiscount={yearlyDiscountDisplay} />

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8"
        variants={container}
        initial="hidden"
        animate={isInView ? "show" : "hidden"}
      >
        {plans.map((plan, index) => {
          let ctaText = plan.buttonText;
          let ctaDisabled = false;
          let ctaLink = "#";
          
          if (plan.name === "Free") {
            ctaText = "Get Started Free";
            ctaLink = "#"; // Could link to sign up
          } else if (plan.name === "Premium") {
            if (isLoadingStatus) {
              ctaText = "Loading...";
              ctaDisabled = true;
            } else if (isProUser) {
              ctaText = "Current Plan";
              ctaDisabled = true;
            } else {
              ctaText = "Upgrade Now";
              ctaLink = "#"; // Link to checkout
            }
          } else if (plan.name === "Premium Plus") {
            ctaText = "Contact Sales";
            ctaLink = "mailto:sales@tildra.xyz?subject=Premium Plus Inquiry";
          }

          const currentPrice = billingCycle === "monthly" ? plan.price.monthly : Math.round(plan.price.yearly / 12);
          const yearlyTotal = plan.price.yearly;
          
          return (
            <motion.div key={plan.name} variants={item}>
              <PricingCard
                title={plan.name}
                price={plan.price.monthly === 0 ? "$0" : `$${currentPrice}`}
                pricePeriod={plan.price.monthly === 0 ? "" : billingCycle === "monthly" ? "month" : "month, billed annually"}
                yearlyPrice={billingCycle === "yearly" && plan.price.yearly > 0 ? `$${yearlyTotal}/year` : undefined}
                description={plan.description}
                features={plan.features.map(feature => ({ 
                  name: feature.name, 
                  included: feature.included 
                }))}
                ctaText={ctaText}
                ctaLink={ctaLink}
                ctaDisabled={ctaDisabled}
                billingCycle={billingCycle}
                isPrimary={plan.popular && !isProUser}
                popularBadge={plan.popular && !isProUser}
              />
            </motion.div>
          );
        })}
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
