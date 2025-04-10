"use client"

import { GraduationCap, Briefcase, BookOpen, Users } from "lucide-react"
import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"

export function UseCases() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <section
      id="use-cases"
      className="container mx-auto px-4 py-20 bg-gradient-to-b from-muted/50 to-background rounded-3xl"
      ref={ref}
    >
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Who Benefits</h2>
        <p className="text-foreground/70 max-w-2xl mx-auto">
          Brevity is designed for anyone who needs to quickly understand content
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
        variants={container}
        initial="hidden"
        animate={isInView ? "show" : "hidden"}
      >
        <motion.div
          className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow hover-lift text-center"
          variants={item}
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
            <GraduationCap className="text-primary" size={28} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Students</h3>
          <p className="text-foreground/70 text-sm">Quickly digest research papers and study materials</p>
        </motion.div>

        <motion.div
          className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow hover-lift text-center"
          variants={item}
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Briefcase className="text-primary" size={28} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Professionals</h3>
          <p className="text-foreground/70 text-sm">Stay informed without spending hours reading industry news</p>
        </motion.div>

        <motion.div
          className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow hover-lift text-center"
          variants={item}
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
            <BookOpen className="text-primary" size={28} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Researchers</h3>
          <p className="text-foreground/70 text-sm">Quickly evaluate papers to determine relevance to your work</p>
        </motion.div>

        <motion.div
          className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow hover-lift text-center"
          variants={item}
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Users className="text-primary" size={28} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Casual Readers</h3>
          <p className="text-foreground/70 text-sm">Get the gist of trending articles without the fluff</p>
        </motion.div>
      </motion.div>
    </section>
  )
}
