"use client"

import { DownloadCloud, MousePointerClick, FileText } from "lucide-react"
import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"

export function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <section
      id="how-it-works"
      className="container mx-auto px-4 py-20 bg-card text-card-foreground rounded-3xl relative z-10"
    >
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        ref={ref}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works (Extension)</h2>
        <p className="text-foreground/70 max-w-2xl mx-auto">
          Summarize articles seamlessly with the Tildra Chrome Extension
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        variants={container}
        initial="hidden"
        animate={isInView ? "show" : "hidden"}
      >
        <motion.div
          className="flex flex-col items-center text-center p-6 rounded-xl hover:bg-muted/50 transition-colors hover-lift"
          variants={item}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <motion.div
            className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4"
            whileHover={{ rotate: 5 }}
          >
            <DownloadCloud className="text-primary" size={28} />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">Install the Extension</h3>
          <p className="text-foreground/70">Add Tildra to your Chrome browser in seconds from the Chrome Web Store.</p>
          <div className="mt-4 text-5xl font-light text-primary/20">1</div>
        </motion.div>

        <motion.div
          className="flex flex-col items-center text-center p-6 rounded-xl hover:bg-muted/50 transition-colors hover-lift"
          variants={item}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <motion.div
            className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4"
            whileHover={{ rotate: 5 }}
          >
            <MousePointerClick className="text-primary" size={28} />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">Click on an Article</h3>
          <p className="text-foreground/70">When you're on an article page, simply click the Tildra icon in your browser.</p>
          <div className="mt-4 text-5xl font-light text-primary/20">2</div>
        </motion.div>

        <motion.div
          className="flex flex-col items-center text-center p-6 rounded-xl hover:bg-muted/50 transition-colors hover-lift"
          variants={item}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <motion.div
            className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4"
            whileHover={{ rotate: 5 }}
          >
            <FileText className="text-primary" size={28} />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">Get Instant Summary</h3>
          <p className="text-foreground/70">Tildra instantly provides a TL;DR and key points without leaving the page.</p>
          <div className="mt-4 text-5xl font-light text-primary/20">3</div>
        </motion.div>
      </motion.div>
    </section>
  )
}
