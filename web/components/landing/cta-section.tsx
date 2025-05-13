"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { ArrowRight, Chrome } from "lucide-react"
import Link from "next/link"

export function CtaSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section className="container mx-auto px-4 py-20" ref={ref}>
      <motion.div
        className="max-w-4xl mx-auto text-center bg-card border border-border/40 rounded-3xl p-10 md:p-16 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to save time and consume content more efficiently?
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto mb-8">
            Join thousands of users who use Tildra daily to extract key insights from articles without the time commitment.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <motion.button
                className="gradient-button px-6 py-3 rounded-lg font-medium hover-lift ripple button-glow flex items-center justify-center gap-2 text-lg group w-full sm:w-auto"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Try for Free
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                >
                  <ArrowRight size={18} />
                </motion.div>
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
} 