"use client"

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

function BenefitCard({ icon, title, description, index }: BenefitCardProps) {
  return (
    <motion.div 
      className="flex flex-col gap-4 p-6 rounded-lg border bg-background hover:shadow-md transition-all duration-300 hover:border-primary/20 hover:bg-muted/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
    >
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const benefits = [
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Save 5+ hours per week",
      description: "Stop spending hours reading lengthy articles. Get the essence in seconds and reclaim your time."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Never miss key insights",
      description: "Our AI identifies and extracts the most important points so you never miss critical information."
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Stay ahead of competition",
      description: "Process more industry content faster to spot trends and opportunities before others do."
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Read 10x more content",
      description: "AI-powered summaries let you consume exponentially more information with better retention."
    }
  ];

  return (
    <section className="w-full py-16 lg:py-20" ref={ref} id="features">
      <div className="container mx-auto px-4">
        <motion.div 
          className="flex flex-col items-center text-center mb-12 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚡</span>
            <Badge variant="outline" className="text-sm">Why Choose Tildra</Badge>
            <span className="text-2xl">🚀</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight max-w-3xl">
            Transform how you consume information
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl">
            Join thousands of professionals who've transformed their reading workflow with AI-powered summaries.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <BenefitCard
              key={index}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
              index={index}
            />
          ))}
        </div>

        <motion.div 
          className="bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-primary/10 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="space-y-3 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-2xl">🎯</span>
              <h3 className="text-2xl font-bold">Ready to reclaim your time?</h3>
            </div>
            <p className="text-muted-foreground max-w-md">
              Join thousands of professionals who've transformed their information workflow with Tildra.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="font-medium shadow-lg hover:shadow-xl">
              <Link href="/dashboard">Start Free Trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="group shadow-md hover:shadow-lg">
              <Link href="/pricing">
                See Pricing
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
