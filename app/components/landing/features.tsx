"use client"

import { Clock, Brain, Sparkles, Laptop } from "lucide-react"
import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"

export function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

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
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
  }

  return (
    <section id="features" className="container mx-auto px-4 py-20" ref={ref}>
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
        <p className="text-foreground/70 max-w-2xl mx-auto">
          Brevity is packed with powerful features to help you digest information faster
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        variants={container}
        initial="hidden"
        animate={isInView ? "show" : "hidden"}
      >
        <motion.div
          className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow hover-lift"
          variants={item}
        >
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Clock className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Saves Time</h3>
          <p className="text-foreground/70">
            Get the essence of lengthy articles in seconds instead of minutes or hours
          </p>
        </motion.div>

        <motion.div
          className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow hover-lift"
          variants={item}
        >
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Brain className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
          <p className="text-foreground/70">
            Leverages DeepSeek AI to intelligently extract the most important information
          </p>
        </motion.div>

        <motion.div
          className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow hover-lift"
          variants={item}
        >
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Sparkles className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Key Insights</h3>
          <p className="text-foreground/70">
            Extracts the most important points so you never miss critical information
          </p>
        </motion.div>

        <motion.div
          className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow hover-lift"
          variants={item}
        >
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Laptop className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Easy to Use</h3>
          <p className="text-foreground/70">
            Simple interface that works seamlessly on any device, browser or as an extension
          </p>
        </motion.div>
      </motion.div>
    </section>
  )
}
