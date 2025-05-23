"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Chrome, Sparkles } from "lucide-react"
import Link from "next/link"

export function FinalCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <section 
      ref={ref}
      className="relative py-20 bg-gradient-to-r from-primary to-secondary overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Sparkles className="h-4 w-4 text-white" />
            <span className="text-white font-medium">Join thousands of satisfied users</span>
          </motion.div>

          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Ready to reclaim your time?
          </motion.h2>

          <motion.p
            className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Join thousands of professionals who&apos;ve revolutionized their reading workflow. 
            Start summarizing articles in seconds, not hours.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-white text-black dark:text-black hover:bg-white/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 px-8 py-6 text-lg font-semibold"
            >
              <Link href="/dashboard">
                Try Tildra Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <a 
              href="https://chrome.google.com/webstore/detail/tildra/jjcdkjjdonfmpenonghicgejhlojldmh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 backdrop-blur-sm px-6 py-3 text-base font-semibold transform hover:scale-105 transition-all duration-300 rounded-md border"
            >
              <Chrome className="h-4 w-4" />
              Get Chrome Extension
            </a>
          </motion.div>

          <motion.p
            className="text-white/70 text-sm mt-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            No credit card required • Free forever • Upgrade anytime
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
} 