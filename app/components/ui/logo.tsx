"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  animated?: boolean
  href?: string
}

export function Logo({ size = "md", animated = false, href = "/" }: LogoProps) {
  const sizes = {
    sm: { logo: "w-6 h-6", text: "text-lg" },
    md: { logo: "w-9 h-9", text: "text-xl" },
    lg: { logo: "w-10 h-10", text: "text-2xl" },
  }

  const LogoContent = () => (
    <div className="flex items-center gap-3">
      {animated ? (
        <motion.div
          className={`relative ${sizes[size].logo} rounded-lg overflow-hidden shadow-lg`}
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
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
              width={48}
              height={48}
              className="w-full h-full object-contain p-2"
              quality={100}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div 
          className={`relative ${sizes[size].logo} rounded-lg overflow-hidden shadow-md`}
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
              width={48}
              height={48}
              className="w-full h-full object-contain p-2"
              quality={100}
            />
          </div>
        </motion.div>
      )}
      <span className={`font-semibold gradient-text ${sizes[size].text}`}>Tildra</span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="focus-ring-animate relative focus:outline-none rounded-lg z-40">
        <LogoContent />
      </Link>
    )
  }

  return <LogoContent />
}
