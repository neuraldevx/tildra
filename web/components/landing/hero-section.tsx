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
      <div className="container mx-auto px-4">
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
                <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                  in Seconds with AI
                </span>
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
                Tildra uses advanced AI to extract key insights from any article, 
                saving you time while ensuring you never miss important information.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "shadow-lg hover:shadow-xl",
                    "transition-all duration-300",
                    "transform hover:scale-105",
                    "px-8 py-6 text-lg font-semibold",
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
                    "text-foreground/80 dark:text-foreground/70",
                    "hover:bg-muted/50",
                    "transition-all duration-300",
                    "transform hover:scale-105",
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

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 pt-8 w-full max-w-4xl">
                {statsData.map((stat, index) => (
                <motion.div
                    key={index} 
                    className="flex flex-col items-center space-y-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                  >
                    <span className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary">{stat.value}</span>
                    <span className="text-sm md:text-base text-muted-foreground">{stat.label}</span>
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
