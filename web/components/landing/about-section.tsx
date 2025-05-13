"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Users, Clock, Award } from "lucide-react"

interface Statistic {
  label: string
  value: string
  description: string
  icon: React.ReactNode
}

export function AboutSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const statistics: Statistic[] = [
    {
      label: "Users",
      value: "5k+",
      description: "Active users",
      icon: <Users className="h-5 w-5 text-primary" />,
    },
    {
      label: "Time",
      value: "55%",
      description: "Reading time saved",
      icon: <Clock className="h-5 w-5 text-primary" />,
    },
    {
      label: "Quality",
      value: "95%",
      description: "Accuracy rate",
      icon: <Award className="h-5 w-5 text-primary" />,
    },
  ]

  return (
    <section id="about" className="container mx-auto px-4 py-20" ref={ref}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">About Tildra</h2>
          <div className="space-y-4 text-foreground/80">
            <p>
              Tildra was created with a simple mission: to help people extract valuable information from content without spending hours reading.
            </p>
            <p>
              Tildra is built to intelligently identify the most important points in any article, saving you time while ensuring you don't miss critical information.
            </p>
            <p>
              Whether you're a student, professional, researcher, or casual reader, Tildra helps you stay informed and make the most of your reading time.
            </p>
            <p className="font-medium">
              Join thousands of users who have already discovered a better way to consume content online.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {statistics.map((stat, index) => (
            <motion.div
              key={index}
              className="bg-card border border-border/40 rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-foreground/60">{stat.description}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 