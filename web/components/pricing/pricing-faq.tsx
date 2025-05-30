"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

interface FaqItem {
  question: string
  answer: string
}

export function PricingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqItems: FaqItem[] = [
    {
      question: "How does the summary limit work?",
      answer:
        "The free plan includes 10 summaries per day. A summary is counted each time you generate a new summary for an article or text. Your daily limit resets at midnight UTC. With the Premium plan, you get 500 summaries per month, and access to new features as they are released.",
    },
    {
      question: "What if I need more than 500 summaries per month?",
      answer:
        "If you're a Premium user who needs more summaries, you have several options: upgrade to Premium Plus (1,500 summaries/month), purchase one-time summary add-on packs, or contact our sales team for custom enterprise pricing. We're happy to work with you to find the right solution for your needs.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer:
        "Yes, you can cancel your Premium subscription at any time. If you cancel, you'll still have access to Premium features until the end of your current billing period. After that, your account will automatically switch to the Free plan.",
    },
    {
      question: "What payment methods are accepted?",
      answer:
        "We accept all major credit cards including Visa, Mastercard, American Express, and Discover. Payments are securely processed through Stripe, our payment processor. We do not store your credit card information on our servers.",
    },
    {
      question: "What's the difference between Standard and Advanced AI models?",
      answer:
        "The Standard AI model provides good quality summaries for most articles and is optimized for speed. The Advanced AI model, available with Premium, offers more nuanced summaries, better handling of complex topics, and can better preserve the context and tone of the original content.",
    },
  ]

  return (
    <div className="space-y-4">
      {faqItems.map((item, index) => (
        <motion.div
          key={index}
          className="border border-border rounded-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          <button
            className="flex justify-between items-center w-full p-4 text-left bg-card hover:bg-muted/50 transition-colors"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <span className="font-medium">{item.question}</span>
            <motion.div animate={{ rotate: openIndex === index ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown className="h-5 w-5 text-foreground/70" />
            </motion.div>
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-4 pt-0 bg-card border-t border-border">
                  <p className="text-foreground/70">{item.answer}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}
