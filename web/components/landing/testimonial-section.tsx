"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Star, Quote, CheckCircle } from "lucide-react"

const testimonials = [
  {
    id: 1,
    name: "Emily Rodriguez",
    role: "Content Marketing Manager",
    company: "TechFlow",
    image: "/api/placeholder/64/64",
    content: "Tildra has revolutionized my content research process. I can now analyze competitor articles and industry reports in minutes instead of hours. The accuracy of the summaries is remarkable.",
    rating: 5,
    verified: true,
    highlight: "Saves 3+ hours daily"
  },
  {
    id: 2,
    name: "Dr. Michael Chen",
    role: "Research Scientist",
    company: "BioInnovate Labs",
    image: "/api/placeholder/64/64",
    content: "As a researcher who needs to stay current with hundreds of papers, Tildra is invaluable. The AI understands scientific content exceptionally well and never misses key findings.",
    rating: 5,
    verified: true,
    highlight: "Processes 50+ papers weekly"
  },
  {
    id: 3,
    name: "Sarah Thompson",
    role: "Investment Analyst",
    company: "Capital Ventures",
    image: "/api/placeholder/64/64",
    content: "The Chrome extension is a game-changer for financial analysis. I can quickly digest market reports and news articles while building investment theses. Absolutely essential for my workflow.",
    rating: 5,
    verified: true,
    highlight: "Essential for market analysis"
  }
]

const metrics = [
  { value: "4.9/5", label: "Average Rating" },
  { value: "Thousands", label: "Happy Users" },
  { value: "99.2%", label: "Satisfaction Rate" }
]

export function TestimonialSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="testimonials" ref={ref} className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our Users Say
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Discover how professionals across industries are transforming their reading workflow with Tildra
          </p>
          
          {/* Metrics */}
          <div className="flex flex-wrap justify-center gap-8 mt-6">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {metric.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {metric.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              className="bg-background rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              {/* Quote Icon */}
              <Quote className="h-8 w-8 text-primary/30 mb-4" />
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                {testimonial.verified && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      Verified
                    </span>
                  </div>
                )}
              </div>

              {/* Highlight Badge */}
              <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium mb-4">
                {testimonial.highlight}
              </div>

              {/* Content */}
              <blockquote className="text-muted-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-foreground">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center bg-background rounded-2xl p-8 border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="flex justify-center mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Join thousands of satisfied users
          </h3>
          <p className="text-muted-foreground">
            Experience the difference Tildra can make in your daily workflow
          </p>
        </motion.div>
      </div>
    </section>
  )
} 