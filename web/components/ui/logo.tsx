
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
    md: { logo: "w-8 h-8", text: "text-xl" },
    lg: { logo: "w-10 h-10", text: "text-2xl" },
  }

  const LogoContent = () => (
    <div className="flex items-center gap-2">
      {animated ? (
        <motion.div
          className={`relative ${sizes[size].logo} rounded-lg overflow-hidden`}
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            type: "tween"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-90"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/images/logo.png"
              alt="Tildra Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain p-1"
            />
          </div>
        </motion.div>
      ) : (
        <div className={`relative ${sizes[size].logo} rounded-lg overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-90"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/images/logo.png"
              alt="Tildra Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain p-1"
            />
          </div>
        </div>
      )}
      <span className={`font-semibold gradient-text ${sizes[size].text}`}>Tildra</span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="focus-ring-animate relative focus:outline-none rounded-lg">
        <LogoContent />
      </Link>
    )
  }

  return <LogoContent />
}
