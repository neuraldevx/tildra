"use client"

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Check, Star, Chrome } from "lucide-react";
import { useInView } from "framer-motion";
import { useRef } from "react";

export function ExtensionCallout() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      className="relative bg-background text-foreground py-16 px-4 md:py-24 overflow-hidden"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <motion.div 
            className="flex flex-col gap-6"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
          >
            <Badge 
              variant="outline" 
              className="w-fit bg-background/80 backdrop-blur-sm border-border/50 px-3 py-1"
            >
              <Star className="h-3.5 w-3.5 mr-1 text-yellow-500" />
              <span>Chrome Extension</span>
            </Badge>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Summarize any web content with{" "}
              <span className="text-primary">one click</span>
            </h2>
            
            <p className="text-lg text-muted-foreground max-w-xl">
              Tildra's Chrome extension gives you instant AI-powered summaries of articles, 
              research papers, news, and more — directly on any webpage you visit.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <AnimatedDownloadButton />
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <span className="text-sm font-medium">
                  Joined by thousands+ users
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Works on any website, article or document</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Customizable summary length and style</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Save summaries for later reference</span>
              </div>
            </div>
          </motion.div>
          
          {/* Right Column - Extension Preview */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/10 rounded-xl pointer-events-none" />
            
            <Card className="overflow-hidden border-border/50 shadow-xl">
              <CardContent className="p-0">
                <div className="bg-zinc-800 h-10 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 bg-zinc-700 h-6 rounded-md flex items-center px-3">
                    <span className="text-xs text-zinc-400 truncate">example.com/article</span>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="w-full h-64 bg-gradient-to-b from-muted/50 to-muted p-6">
                    <div className="space-y-3">
                      <div className="h-6 bg-foreground/10 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-foreground/5 rounded w-full"></div>
                        <div className="h-3 bg-foreground/5 rounded w-full"></div>
                        <div className="h-3 bg-foreground/5 rounded w-5/6"></div>
                        <div className="h-3 bg-foreground/5 rounded w-full"></div>
                        <div className="h-3 bg-foreground/5 rounded w-4/5"></div>
                      </div>
                    </div>
                  </div>
                  
                  <motion.div 
                    className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-primary/20 max-w-[300px]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">T</div>
                        <span className="font-semibold">Tildra Summary</span>
                      </div>
                      <Badge variant="outline" className="text-xs">AI</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="h-3 bg-primary/20 rounded-full w-full" />
                      <div className="h-3 bg-primary/20 rounded-full w-[90%]" />
                      <div className="h-3 bg-primary/20 rounded-full w-[95%]" />
                      <div className="h-3 bg-primary/20 rounded-full w-[85%]" />
                      <div className="h-3 bg-primary/20 rounded-full w-[70%]" />
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Generated in 2.3s</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">Copy</Button>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
            
            <div className="absolute -bottom-6 -right-6 -z-10 h-[300px] w-[300px] bg-primary/10 rounded-full blur-3xl" />
          </motion.div>
        </div>
        
        {/* Testimonial */}
        <motion.div 
          className="mt-16 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="max-w-2xl bg-muted/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <span className="text-sm font-medium">5.0 average rating</span>
              </div>
              
              <p className="italic text-muted-foreground">
                "Tildra has completely changed how I consume content online. I can quickly understand 
                the key points of any article without having to read the whole thing. It's saved me 
                hours of time every week!"
              </p>
              
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <span className="font-medium">JD</span>
                </div>
                <div>
                  <p className="font-medium">Jamie Doe</p>
                  <p className="text-sm text-muted-foreground">Product Manager</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

function AnimatedDownloadButton() {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <a 
      href="https://chrome.google.com/webstore/detail/tildra/jjcdkjjdonfmpenonghicgejhlojldmh" 
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
    >
      <motion.div
        initial={{ width: 180 }}
        whileHover={{ width: 220 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        transition={{ duration: 0.3 }}
        className="bg-primary hover:bg-primary/90 flex items-center justify-center overflow-hidden relative h-11 rounded-md shadow-lg"
      >
        <motion.div
          className="absolute"
          animate={{ 
            opacity: isHovered ? 0 : 1,
            x: isHovered ? -10 : 0
          }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-primary-foreground flex items-center gap-2">
            <Chrome className="h-4 w-4" />
            Add to Chrome
          </span>
        </motion.div>

        <motion.div
          className="w-full flex justify-center items-center"
          initial={{ opacity: 0, x: 20 }}
          animate={{ 
            opacity: isHovered ? 1 : 0,
            x: isHovered ? 0 : 20
          }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-primary-foreground font-bold whitespace-nowrap">
            Install Now — Free
          </span>
        </motion.div>
      </motion.div>
    </a>
  );
}
