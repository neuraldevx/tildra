"use client"

import { Chrome, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"

export function ExtensionCallout() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <section className="container mx-auto px-4 py-16" ref={ref}>
      <motion.div
        className="bg-gradient-to-r from-primary to-secondary dark:from-primary/90 dark:to-secondary/90 rounded-3xl p-8 md:p-12 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <motion.h2
              className="text-3xl md:text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Get the Chrome Extension
            </motion.h2>
            <motion.p
              className="text-white/90 mb-6 max-w-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Summarize any article with just one click while browsing. Install our Chrome extension for a seamless
              experience.
            </motion.p>
            <motion.button
              className="bg-white text-zinc-900 px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-shadow hover-lift flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Chrome size={20} />
              Add to Chrome
              <ArrowRight size={16} />
            </motion.button>
          </div>
          <motion.div
            className="flex-1 flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative">
              <motion.div
                className="bg-white/20 backdrop-blur-sm p-6 rounded-xl"
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                transition={{ duration: 0.2 }}
              >
                <Chrome size={64} className="text-white mb-4" />
                <div className="space-y-2">
                  <div className="bg-white/30 h-4 w-32 rounded-md"></div>
                  <div className="bg-white/30 h-4 w-40 rounded-md"></div>
                  <div className="bg-white/30 h-4 w-24 rounded-md"></div>
                </div>
              </motion.div>
              <motion.div
                className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full"
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1, rotate: [0, 10, 0] } : { scale: 0 }}
                transition={{ duration: 0.4, delay: 0.6, type: "tween" }}
              >
                FREE
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
