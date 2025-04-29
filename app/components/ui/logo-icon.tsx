"use client"

import { motion } from "framer-motion"
import Image from "next/image"

interface LogoIconProps {
  size?: number
  className?: string
  animated?: boolean
}

export function LogoIcon({ size = 32, className = "", animated = false }: LogoIconProps) {
  if (animated) {
    return (
      <motion.div 
        className={`relative rounded-lg overflow-hidden shadow-md ${className}`} 
        style={{ width: size, height: size }}
        whileHover={{ 
          scale: 1.05,
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" 
        }}
        animate={{ y: [0, -3, 0] }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-90"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/images/tildra-logo.png"
            alt="Tildra Logo"
            width={size}
            height={size}
            className="w-full h-full object-contain p-1.5"
            quality={100}
          />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className={`relative rounded-lg overflow-hidden shadow-md ${className}`} 
      style={{ width: size, height: size }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" 
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-90"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/images/tildra-logo.png"
          alt="Tildra Logo"
          width={size}
          height={size}
          className="w-full h-full object-contain p-1.5"
          quality={100}
        />
      </div>
    </motion.div>
  )
}
