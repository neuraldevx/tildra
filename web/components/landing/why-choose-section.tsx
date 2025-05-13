"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Check, X } from "lucide-react"

interface ComparisonItem {
  feature: string
  tildra: boolean
  competitors: boolean
}

export function WhyChooseSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const comparisonItems: ComparisonItem[] = [
    {
      feature: "AI-powered summarization",
      tildra: true,
      competitors: true,
    },
    {
      feature: "Extract key points automatically",
      tildra: true,
      competitors: false,
    },
    {
      feature: "One-click browser extension",
      tildra: true,
      competitors: true,
    },
    {
      feature: "No account required for basic use",
      tildra: true,
      competitors: false,
    },
    {
      feature: "Works with any article or web content",
      tildra: true,
      competitors: false,
    },
    {
      feature: "Clean, distraction-free interface",
      tildra: true,
      competitors: false,
    },
  ]

  return (
    <section id="why-choose" className="container mx-auto px-4 py-20" ref={ref}>
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Tildra</h2>
        <p className="text-foreground/70 max-w-2xl mx-auto">
          See how Tildra compares to other summarization tools
        </p>
      </motion.div>

      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-3 gap-4 mb-6 text-center font-semibold">
          <div className="col-span-1">Features</div>
          <div className="col-span-1">Tildra</div>
          <div className="col-span-1">Others</div>
        </div>

        {comparisonItems.map((item, index) => (
          <motion.div
            key={index}
            className="grid grid-cols-3 gap-4 py-4 border-b border-border/30"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
          >
            <div className="col-span-1 text-foreground/80">{item.feature}</div>
            <div className="col-span-1 flex justify-center">
              {item.tildra ? (
                <div className="bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-100 rounded-full p-1.5 w-8 h-8 flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              ) : (
                <div className="bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-100 rounded-full p-1.5 w-8 h-8 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="col-span-1 flex justify-center">
              {item.competitors ? (
                <div className="bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-100 rounded-full p-1.5 w-8 h-8 flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              ) : (
                <div className="bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-100 rounded-full p-1.5 w-8 h-8 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
} 