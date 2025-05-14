"use client"

import Link from "next/link"
import Image from "next/image"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  animated?: boolean
  href?: string
  showText?: boolean
}

export function Logo({ size = "md", animated = false, href = "/", showText = true }: LogoProps) {
  const sizes = {
    sm: { logo: "w-8 h-8", text: "text-lg" },
    md: { logo: "w-10 h-10", text: "text-xl" },
    lg: { logo: "w-12 h-12", text: "text-2xl" },
  }

  // Add CSS for the gradient animation and logo effects
  const logoStyles = `
    @keyframes gradientShift {
      0% { background-position: 0% 50% }
      50% { background-position: 100% 50% }
      100% { background-position: 0% 50% }
    }
    
    .gradient-logo-text {
      background: linear-gradient(90deg, #7873f5, #ec4899, #8b5cf6);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      transition: all 0.3s ease;
    }
    
    .animated-gradient {
      animation: gradientShift 4s ease infinite;
    }
    
    .logo-container:hover .gradient-logo-text {
      filter: brightness(1.2);
    }
    
    .logo-image {
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      transition: all 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67);
    }
    
    .logo-container:hover .logo-image {
      transform: scale(1.05);
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
    }
    
    @keyframes subtle-float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-2px); }
      100% { transform: translateY(0px); }
    }
    
    .animated-logo {
      animation: subtle-float 3s ease-in-out infinite;
    }
  `;

  const LogoContent = () => (
    <div className={`flex items-center gap-3 logo-container`}>
      {/* The logo image - direct, without background divs */}
      <div className={`${sizes[size].logo} relative flex-shrink-0`}>
        <Image
          src="/images/logo-new.png"
          alt="Tildra Logo"
          width={60}
          height={60}
          className={`w-full h-full object-contain logo-image ${animated ? 'animated-logo' : ''}`}
          priority
        />
      </div>
      
      {/* Only show text when needed */}
      {showText && (
        <span className={`font-medium ${sizes[size].text} logo-text gradient-logo-text self-center ${animated ? 'animated-gradient' : ''} group-data-[collapsible=icon]:hidden`}>
          Tildra
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <>
        <style jsx global>{logoStyles}</style>
        <Link href={href} className="focus-ring-animate relative focus:outline-none">
          <LogoContent />
        </Link>
      </>
    )
  }

  return (
    <>
      <style jsx global>{logoStyles}</style>
      <LogoContent />
    </>
  )
}
