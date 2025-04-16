"use client"

import * as React from "react"

// Simple hook to check if the user is on a mobile device based on window width
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Initial check
    checkDevice()

    // Check on resize
    window.addEventListener("resize", checkDevice)

    // Cleanup listener
    return () => {
      window.removeEventListener("resize", checkDevice)
    }
  }, [breakpoint])

  return isMobile
} 