"use client"

import { motion } from "framer-motion"

interface PricingToggleProps {
  billingCycle: "monthly" | "yearly"
  onChange: (value: "monthly" | "yearly") => void
  yearlyDiscount: number
}

export function PricingToggle({ billingCycle, onChange, yearlyDiscount }: PricingToggleProps) {
  return (
    <div className="flex flex-col items-center justify-center mb-8">
      <div className="flex items-center bg-card border border-border rounded-lg p-1 relative">
        <button
          onClick={() => onChange("monthly")}
          className={`relative z-10 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            billingCycle === "monthly" ? "text-primary-foreground" : "text-foreground/70"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => onChange("yearly")}
          className={`relative z-10 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            billingCycle === "yearly" ? "text-primary-foreground" : "text-foreground/70"
          }`}
        >
          Yearly
        </button>
        <motion.div
          className="absolute inset-0 z-0 rounded-md m-1 bg-primary"
          initial={false}
          animate={{
            x: billingCycle === "monthly" ? 0 : "100%",
            width: "50%",
          }}
          transition={{ type: "tween", duration: 0.3 }}
          style={{ x: billingCycle === "monthly" ? 0 : "calc(100% - 100%)" }}
        />
      </div>
      {billingCycle === "yearly" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-2 text-sm text-primary font-medium"
        >
          Save {yearlyDiscount}% with annual billing
        </motion.div>
      )}
    </div>
  )
}
