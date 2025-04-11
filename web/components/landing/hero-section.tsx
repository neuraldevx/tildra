"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useRef } from "react"

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <section className="container mx-auto px-4 py-20 md:py-32 relative z-10">
      <div className="flex flex-col md:flex-row items-center gap-12" ref={containerRef}>
        <motion.div
          className="flex-1 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="block">Understand Articles</span>
            <motion.span
              className="gradient-text inline-block"
              animate={{
                backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
              }}
              transition={{
                duration: 8,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              style={{
                backgroundSize: "200% 100%",
              }}
            >
              in Seconds
            </motion.span>
          </motion.h1>
          <motion.p
            className="text-xl text-foreground/70 max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Tildra uses AI to instantly transform lengthy articles into concise TL;DRs and key points, saving you time
            without sacrificing understanding.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link
              href="/dashboard"
              className="gradient-button px-6 py-3 rounded-lg font-medium hover-lift ripple button-glow flex items-center justify-center gap-2 text-lg group"
            >
              Try the Web App
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                  ease: "easeInOut",
                  type: "tween"
                }}
              >
                <ArrowRight size={18} />
              </motion.div>
            </Link>
            <button
              className="border-2 border-border bg-background text-foreground px-6 py-3 rounded-lg font-medium 
                         hover:border-primary/50 transition-all duration-300 hover-lift ripple
                         hover:bg-primary/5 flex items-center justify-center gap-2 text-lg"
            >
              Install Chrome Extension
            </button>
          </motion.div>
        </motion.div>
        <motion.div
          className="flex-1 relative"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.div
            className="relative z-10 bg-card text-card-foreground rounded-xl shadow-xl p-6 max-w-md mx-auto"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <div className="flex-1 bg-muted h-6 rounded-md ml-2"></div>
            </div>
            <div className="space-y-4">
              <div className="bg-muted h-8 rounded-md w-3/4"></div>
              <div className="bg-muted h-4 rounded-md"></div>
              <div className="bg-muted h-4 rounded-md"></div>
              <div className="bg-muted h-4 rounded-md w-5/6"></div>
              <motion.div
                className="bg-primary/10 p-4 rounded-md"
                initial={{ scale: 0.95, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.8,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                  repeatDelay: 5,
                  ease: "easeInOut",
                }}
              >
                <div className="font-semibold text-primary mb-2">TL;DR</div>
                <div className="bg-card h-4 rounded-md mb-2"></div>
                <div className="bg-card h-4 rounded-md w-5/6"></div>
              </motion.div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Key Points</div>
                <motion.div
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 1.0 }}
                >
                  <div className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="bg-card h-4 rounded-md flex-1"></div>
                </motion.div>
                <motion.div
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 1.2 }}
                >
                  <div className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="bg-card h-4 rounded-md flex-1"></div>
                </motion.div>
                <motion.div
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 1.4 }}
                >
                  <div className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="bg-card h-4 rounded-md flex-1"></div>
                </motion.div>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl transform rotate-3 scale-105 -z-10"
            animate={{
              rotate: [3, 2, 3],
              scale: [1.05, 1.03, 1.05],
            }}
            transition={{ 
                duration: 8, 
                repeat: Number.POSITIVE_INFINITY, 
                ease: "easeInOut", 
                type: "tween"
            }}
          ></motion.div>
        </motion.div>
      </div>
    </section>
  )
}
