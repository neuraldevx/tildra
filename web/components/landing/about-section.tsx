"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Users, Target, Lightbulb, Award } from "lucide-react"

const values = [
  {
    icon: Target,
    title: "Our Mission",
    description: "To democratize access to information by making it faster and easier for everyone to understand complex content."
  },
  {
    icon: Lightbulb,
    title: "Innovation First",
    description: "We leverage cutting-edge AI technology to continuously improve how people consume and process information."
  },
  {
    icon: Users,
    title: "User-Centric",
    description: "Every feature we build is designed with our users' productivity and success in mind."
  },
  {
    icon: Award,
    title: "Quality Driven",
    description: "We maintain the highest standards for accuracy and reliability in every summary we generate."
  }
]

const stats = [
  { value: "2025", label: "Founded" },
  { value: "Thousands", label: "Users" },
  { value: "2M+", label: "Articles Processed" },
  { value: "98%", label: "Accuracy Rate" }
]

export function AboutSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="about" ref={ref} className="py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            About Tildra
          </h2>
          <p className="text-base text-muted-foreground max-w-3xl mx-auto">
            We&apos;re on a mission to help professionals and students process information more efficiently, 
            saving time while ensuring they never miss critical insights.
          </p>
        </motion.div>

        {/* Story Section */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              The Problem We're Solving
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                In today&apos;s information-rich world, professionals spend countless hours reading through 
                lengthy articles, research papers, and reports. Studies show that knowledge workers 
                spend up to 2.5 hours daily just processing information.
              </p>
              <p>
                We created Tildra to solve this problem. Using advanced AI technology, we help people 
                extract key insights from any content in seconds, not hours. This means more time for 
                strategic thinking, decision-making, and the work that truly matters.
              </p>
              <p>
                Since our founding in 2025, we&apos;ve helped thousands of professionals reclaim their time 
                and stay better informed than ever before.
              </p>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  >
                    <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Values Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <value.icon className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">{value.title}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-16 bg-muted/50 rounded-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Join Our Growing Community
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Whether you're a student, researcher, professional, or casual reader, 
            Tildra helps you stay informed and make the most of your reading time.
          </p>
          <div className="flex justify-center">
            <div className="text-sm text-muted-foreground">
              Trusted by professionals at leading companies worldwide
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 