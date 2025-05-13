"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Quote, Star } from "lucide-react"
import Image from "next/image"

interface Testimonial {
  quote: string
  name: string
  title: string
  company: string
  avatar?: string
}

export function TestimonialSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const testimonials: Testimonial[] = [
    {
      quote: "Tildra has completely changed how I consume content online. I can get the key points from multiple articles in the time it would take to read just one.",
      name: "Alex Johnson",
      title: "Product Manager",
      company: "Tech Solutions Inc.",
      avatar: "/images/testimonials/avatar1.png",
    },
    {
      quote: "As a researcher, I have to read dozens of papers weekly. Tildra helps me quickly determine which ones are worth a deep dive and which ones I can skip.",
      name: "Sarah Chen",
      title: "Data Scientist",
      company: "Research Labs",
      avatar: "/images/testimonials/avatar2.png",
    },
    {
      quote: "The Chrome extension is brilliant. One click and I have a summary - it couldn't be easier. This tool has saved me countless hours of reading.",
      name: "Michael Rodriguez",
      title: "Marketing Director",
      company: "Growth Media",
      avatar: "/images/testimonials/avatar3.png",
    },
  ]

  return (
    <section id="testimonials" className="container mx-auto px-4 py-20" ref={ref}>
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Testimonial Section</h2>
        <p className="text-foreground/70 max-w-2xl mx-auto">
          See what our users have to say about Tildra
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={index}
            className="bg-card border border-border/40 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
              <Quote className="text-primary/20 w-8 h-8" />
            </div>
            
            <p className="text-foreground/80 mb-6 text-sm">{testimonial.quote}</p>
            
            <div className="flex items-center">
              {testimonial.avatar ? (
                <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                  <span className="text-primary font-medium">
                    {testimonial.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h4 className="font-medium text-sm">{testimonial.name}</h4>
                <p className="text-xs text-foreground/60">
                  {testimonial.title}, {testimonial.company}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
} 