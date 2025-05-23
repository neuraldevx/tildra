"use client"

import React from 'react'
import { motion, Variants } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Chrome, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// AnimatedGroup component
type PresetType =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'blur'
  | 'blur-slide'
  | 'zoom'
  | 'flip'
  | 'bounce'
  | 'rotate'
  | 'swing';

type AnimatedGroupProps = {
  children: React.ReactNode;
  className?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  preset?: PresetType;
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const presetVariants: Record<
  PresetType,
  { container: Variants; item: Variants }
> = {
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 },
    },
  },
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(4px)' },
      visible: { opacity: 1, filter: 'blur(0px)' },
    },
  },
  'blur-slide': {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(4px)', y: 20 },
      visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
    },
  },
  zoom: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.5 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      },
    },
  },
  flip: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, rotateX: -90 },
      visible: {
        opacity: 1,
        rotateX: 0,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      },
    },
  },
  bounce: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: -50 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 10 },
      },
    },
  },
  rotate: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, rotate: -180 },
      visible: {
        opacity: 1,
        rotate: 0,
        transition: { type: 'spring', stiffness: 200, damping: 15 },
      },
    },
  },
  swing: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, rotate: -10 },
      visible: {
        opacity: 1,
        rotate: 0,
        transition: { type: 'spring', stiffness: 300, damping: 8 },
      },
    },
  },
};

function AnimatedGroup({
  children,
  className,
  variants,
  preset,
}: AnimatedGroupProps) {
  const selectedVariants = preset
    ? presetVariants[preset]
    : { container: defaultContainerVariants, item: defaultItemVariants };
  const containerVariants = variants?.container || selectedVariants.container;
  const itemVariants = variants?.item || selectedVariants.item;

  return (
    <motion.div
      initial='hidden'
      animate='visible'
      variants={containerVariants}
      className={cn(className)}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Mockup component
interface MockupProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'mobile' | 'responsive';
}

const Mockup = React.forwardRef<HTMLDivElement, MockupProps>(
  ({ className, type = 'responsive', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex relative z-10 overflow-hidden shadow-2xl border border-border/5 border-t-border/15",
        type === 'mobile' ? "rounded-[48px] max-w-[350px]" : "rounded-md",
        className
      )}
      {...props}
    />
  ),
);
Mockup.displayName = "Mockup";

// Main HeroSection component
export function HeroSection() {
  const transitionVariants = {
    item: {
      hidden: {
        opacity: 0,
        filter: 'blur(12px)',
        y: 12,
      },
      visible: {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        transition: {
          type: 'spring',
          bounce: 0.3,
          duration: 1.5,
        },
      },
    },
  };

  const statsData = [
    { value: '2M+', label: 'Articles Summarized' },
    { value: '98%', label: 'Accuracy Rate' },
    { value: '30s', label: 'Average Summary Time' },
  ];

  return (
    <section className="w-full py-16 md:py-24 lg:py-32 relative z-10">
      {/* Enhanced background for light mode */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 dark:from-transparent dark:via-transparent dark:to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-8">
            {/* Heading */}
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.2,
                    },
                  },
                },
                ...transitionVariants,
              }}
              className="flex flex-col items-center space-y-6"
            >
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-foreground max-w-5xl">
                Summarize Any Article<br />
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 dark:from-blue-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent animate-pulse">
                  in Seconds with AI
                </span>
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
                Tildra uses advanced AI to extract key insights from any article, 
                saving you time while ensuring you never miss important information.
              </p>

              {/* Enhanced CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700",
                    "shadow-2xl hover:shadow-3xl border-0",
                    "transition-all duration-300",
                    "transform hover:scale-105 hover:-translate-y-1",
                    "px-8 py-6 text-lg font-semibold",
                    "backdrop-blur-sm",
                  )}
                >
                  <Link href="/dashboard">
                    Try Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={cn(
                    "text-gray-700 dark:text-foreground border-2 border-gray-300 dark:border-foreground/30",
                    "bg-white/90 dark:bg-background/80 backdrop-blur-sm",
                    "hover:bg-gray-50 dark:hover:bg-foreground hover:text-gray-900 dark:hover:text-background",
                    "shadow-xl hover:shadow-2xl",
                    "transition-all duration-300",
                    "transform hover:scale-105 hover:-translate-y-1",
                    "px-8 py-6 text-lg font-semibold",
                  )}
                  onClick={() => {
                    // Add Chrome extension download logic
                    window.open('https://chrome.google.com/webstore/detail/tildra/jjcdkjjdonfmpenonghicgejhlojldmh', '_blank');
                  }}
                >
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    window.open('https://chrome.google.com/webstore/detail/tildra/jjcdkjjdonfmpenonghicgejhlojldmh', '_blank');
                  }}>
                    <Chrome className="mr-2 h-5 w-5" />
                    Get Chrome Extension
                  </a>
                </Button>
              </div>

              {/* Enhanced Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto">
                {[
                  { 
                    value: "2M+", 
                    label: "Articles Summarized",
                    color: "text-blue-600 dark:text-blue-400",
                    bgColor: "from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-600/10",
                    borderColor: "border-blue-200 dark:border-blue-500/30"
                  },
                  { 
                    value: "98%", 
                    label: "Accuracy Rate",
                    color: "text-green-600 dark:text-green-400",
                    bgColor: "from-green-50 to-green-100 dark:from-green-500/10 dark:to-green-600/10",
                    borderColor: "border-green-200 dark:border-green-500/30"
                  },
                  { 
                    value: "30s", 
                    label: "Average Summary Time",
                    color: "text-purple-600 dark:text-purple-400",
                    bgColor: "from-purple-50 to-purple-100 dark:from-purple-500/10 dark:to-purple-600/10",
                    borderColor: "border-purple-200 dark:border-purple-500/30"
                  }
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className={cn(
                      "text-center backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl",
                      "bg-gradient-to-br", stat.bgColor,
                      "border-2", stat.borderColor,
                      "transition-all duration-300"
                    )}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
                  >
                    <div className={cn("text-3xl font-bold mb-1", stat.color)}>
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-foreground/70">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatedGroup>

            {/* Mockup */}
            <div className="relative w-full pt-12 px-4 sm:px-6 lg:px-8">
              <AnimatedGroup
                variants={{
                  container: {
                    visible: {
                      transition: {
                        delayChildren: 0.5,
                      },
                    },
                  },
                  item: {
                    hidden: { opacity: 0, y: 20 },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      transition: {
                        type: 'spring',
                        bounce: 0.4,
                        duration: 1.2
                      }
                    },
                  },
                }}
              >
                <Mockup
                  className={cn(
                    "shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] dark:shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]",
                    "border-primary/10 dark:border-primary/5",
                  )}
                >
                <div className="relative w-full bg-background rounded-md overflow-hidden">
                  <div className="flex items-center justify-between bg-muted/50 p-3 border-b">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="w-full max-w-md mx-auto h-6 rounded bg-muted"></div>
                    </div>
                    <div className="w-6"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                    <div className="flex flex-col space-y-4">
                      <div className="h-8 w-3/4 bg-muted rounded"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-5/6"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-4/5"></div>
                      </div>
                      <div className="h-24 bg-muted rounded w-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>
                    
            <motion.div
                      className="bg-primary/5 border border-primary/20 rounded-lg p-5"
                      initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                        opacity: 1, 
                        scale: 1,
                        transition: { delay: 1, duration: 0.5 }
                      }}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-lg font-semibold">Tildra Summary</div>
                        <div className="text-xs text-muted-foreground">Generated in 2.3s</div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <ArrowRight className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                          <div className="h-4 bg-primary/20 rounded w-full"></div>
                        </div>
                        <div className="flex items-start">
                          <ArrowRight className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                          <div className="h-4 bg-primary/20 rounded w-full"></div>
                        </div>
                        <div className="flex items-start">
                          <ArrowRight className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                          <div className="h-4 bg-primary/20 rounded w-5/6"></div>
                        </div>
                        <div className="flex items-start">
                          <ArrowRight className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                          <div className="h-4 bg-primary/20 rounded w-full"></div>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-border">
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-medium">Key Takeaways</div>
                          <div className="text-xs text-muted-foreground">3 points</div>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="h-3 bg-primary/15 rounded w-full"></div>
                          <div className="h-3 bg-primary/15 rounded w-4/5"></div>
                          <div className="h-3 bg-primary/15 rounded w-full"></div>
                        </div>
                      </div>
          </motion.div>
                  </div>
                </div>
              </Mockup>
              </AnimatedGroup>
            </div>
          </div>
        </div>
      </div>

      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/4 h-[256px] w-[60%] -translate-x-1/2 scale-[2.5] rounded-[50%] bg-[radial-gradient(ellipse_at_center,_hsla(var(--primary)/.2)_10%,_hsla(var(--primary)/0)_60%)] sm:h-[512px]" />
        <div className="absolute left-1/2 top-1/4 h-[128px] w-[40%] -translate-x-1/2 scale-[2] rounded-[50%] bg-[radial-gradient(ellipse_at_center,_hsla(var(--primary)/.3)_10%,_hsla(var(--primary)/0)_60%)] sm:h-[256px]" />
      </div>
    </section>
  )
}
