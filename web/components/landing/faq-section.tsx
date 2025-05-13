"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Plus } from "lucide-react"
import { useInView } from "framer-motion"
import { useRef } from "react"

interface FaqItem {
  question: string
  answer: string
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const faqItems: FaqItem[] = [
    {
      question: "How does Tildra work?",
      answer:
        "Tildra uses advanced AI to analyze articles and extract the most important information. Simply paste a URL or text, and our AI will generate a concise TL;DR and key points, saving you time without sacrificing understanding.",
    },
    {
      question: "Is there a limit to how many articles I can summarize?",
      answer:
        "Free users can summarize up to 5 articles per day. For unlimited summaries and access to premium features, you can upgrade to our Premium plan.",
    },
    {
      question: "What types of content can Tildra summarize?",
      answer:
        "Tildra can summarize news articles, blog posts, research papers, and most text-based content. It works best with well-structured articles that have clear paragraphs and sections.",
    },
    {
      question: "Does Tildra work in languages other than English?",
      answer:
        "Currently, Tildra is optimized for English content. We're working on adding support for additional languages in the future.",
    },
  ]

  return (
    <section id="faq" className="container mx-auto px-4 py-20" ref={ref}>
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">FAQ Section</h2>
        <p className="text-foreground/70 max-w-2xl mx-auto">
          Answers to common questions about Tildra
        </p>
      </motion.div>

      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {faqItems.map((item, index) => (
          <motion.div
            key={index}
            className="border-b border-border"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
          >
            <button
              className="flex justify-between items-center w-full py-5 text-left"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              aria-expanded={openIndex === index}
            >
              <h3 className="text-lg font-medium">{item.question}</h3>
              <div className="flex-shrink-0 ml-2">
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-primary" />
                ) : (
                  <Plus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </button>
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="pb-5">
                    <p className="text-foreground/70">{item.answer}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
} 