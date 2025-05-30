"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Star, Quote, Users, Clock, TrendingUp, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const testimonials = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Product Manager",
    company: "TechCorp",
    image: "/api/placeholder/64/64",
    content: "Tildra has completely transformed how I stay on top of industry news. I can now process 10x more articles in the same time and never miss important insights.",
    rating: 5,
    verified: true
  },
  {
    id: 2,
    name: "Marcus Rodriguez", 
    role: "Research Director",
    company: "InnovateLab",
    image: "/api/placeholder/64/64",
    content: "The AI summaries are incredibly accurate. What used to take me 2 hours of reading now takes 15 minutes, and I still get all the key information.",
    rating: 5,
    verified: true
  },
  {
    id: 3,
    name: "Dr. Lisa Wang",
    role: "Data Scientist",
    company: "AI Solutions",
    image: "/api/placeholder/64/64", 
    content: "As someone who needs to review dozens of research papers weekly, Tildra is a game-changer. The Chrome extension makes it seamless.",
    rating: 5,
    verified: true
  }
]

const stats = [
  {
    value: "Thousands",
    label: "Active Users",
    icon: Users,
    description: "Professionals trust Tildra daily"
  },
  {
    value: "2M+",
    label: "Articles Summarized", 
    icon: TrendingUp,
    description: "And growing every day"
  },
  {
    value: "5 hours",
    label: "Saved Per Week",
    icon: Clock,
    description: "Average time saved per user"
  }
]

export function SocialProof() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="testimonials" ref={ref} className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Trusted by professionals worldwide
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of knowledge workers who have enhanced their reading workflow with Tildra
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-20">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="bg-background/95 dark:bg-background rounded-xl p-6 shadow-md border border-gray-200 dark:border-border text-center hover:shadow-lg transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-center justify-center mb-3">
                <stat.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-foreground mb-2">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-gray-600 dark:text-muted-foreground">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              className="bg-card rounded-lg p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              {/* Quote Icon */}
              <Quote className="h-8 w-8 text-primary/20 mb-4" />
              
              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                {testimonial.verified && (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Verified
                  </span>
                )}
              </div>

              {/* Content */}
              <blockquote className="text-muted-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Company logos placeholder */}
        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <p className="text-sm text-muted-foreground mb-8">
            Trusted by teams at leading companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {['Microsoft', 'Google', 'Amazon', 'Meta', 'Apple'].map((company) => (
              <div key={company} className="text-lg font-semibold text-muted-foreground">
                {company}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
} 