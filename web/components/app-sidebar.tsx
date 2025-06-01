"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Settings, 
  PanelLeftClose, 
  PanelLeftOpen,
  Sparkles,
  Star,
  FileText,
  Info,
  User,
  DollarSign,
  LogOut,
  Rocket
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { useSidebar } from '@/components/sidebar-context'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Define your actual navigation items
const mainItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: FileText },
  { title: "Features", url: "/#features", icon: Sparkles },
  { title: "About", url: "/#about", icon: Info },
  { title: "Testimonials", url: "/#testimonials", icon: User },
  { title: "Pricing", url: "/pricing", icon: DollarSign },
]

// Settings and additional items
const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()
  const [isProUser, setIsProUser] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  
  // Custom sidebar state management
  const { isOpen, toggleSidebar } = useSidebar()
  
  // State to track the current URL hash
  const [currentHash, setCurrentHash] = useState('')

  // Fetch premium status for rendering badge
  useEffect(() => {
    let isMounted = true
    const fetchStatus = async () => {
      if (!isSignedIn) {
        if (isMounted) {
          setIsProUser(false)
          setIsLoadingStatus(false)
        }
        return
      }
      try {
        const token = await getToken()
        if (!token) throw new Error("Failed to get session token.")
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://tildra.fly.dev'
        
        // Add timeout for fetch requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        try {
          const response = await fetch(`${apiBaseUrl}/api/user/status`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            console.warn(`Status fetch returned ${response.status}: ${response.statusText}`)
            if (isMounted) {
              setIsProUser(false)
              setIsLoadingStatus(false)
            }
            return
          }
          
          const data = await response.json()
          if (isMounted) {
            setIsProUser(data.is_pro)
            setIsLoadingStatus(false)
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId)
          console.warn("[AppSidebar] Fetch error:", fetchErr instanceof Error ? fetchErr.message : fetchErr)
          if (isMounted) {
            setIsProUser(false)
            setIsLoadingStatus(false)
          }
        }
      } catch (err) {
        console.warn("[AppSidebar] Auth token error:", err instanceof Error ? err.message : err)
        if (isMounted) {
          setIsProUser(false)
          setIsLoadingStatus(false)
        }
      }
    }
    fetchStatus()
    return () => { isMounted = false }
  }, [isSignedIn, getToken])

  // Handle navigation for both regular and hash links
  const handleNavigation = (url: string) => {
    if (url === '/') {
      router.push(url)
      setCurrentHash('')
      if (pathname === '/') {
        window.scrollTo(0, 0)
      }
    } else if (url.includes('#')) {
      const hash = url.substring(url.indexOf('#'))
      router.push(url)
      setCurrentHash(hash)
    } else {
      router.push(url)
    }
  }

  // Effect to listen for hash changes
  useEffect(() => {
    const updateHash = () => {
      const newHash = window.location.hash
      setCurrentHash(newHash)
    }

    updateHash()
    window.addEventListener('hashchange', updateHash)
    return () => {
      window.removeEventListener('hashchange', updateHash)
    }
  }, [])

  return (
    <>
      {/* Floating toggle button when sidebar is closed */}
      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 h-8 w-8 bg-background hover:bg-muted/80 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300"
          onClick={toggleSidebar}
        >
          <PanelLeftOpen className="h-4 w-4" />
          <span className="sr-only">Open Sidebar</span>
        </Button>
      )}

      {/* Custom Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-40 h-full w-64 bg-background border-r border-border/40 transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={true} />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hover:bg-muted/80 border border-border/40 shadow-sm hover:shadow-md transition-all duration-300"
            onClick={toggleSidebar}
          >
            <PanelLeftClose className="h-4 w-4" />
            <span className="sr-only">Close Sidebar</span>
          </Button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Main Navigation */}
          <div className="space-y-2">
            {mainItems.map((item) => {
              const isActive = (() => {
                if (item.url === "/" && currentHash === "") return pathname === "/"
                if (!item.url.includes("#") && item.url !== "/") return pathname.startsWith(item.url)
                if (item.url.startsWith("/#") && pathname === "/") {
                  const itemHash = item.url.substring(1)
                  return itemHash === currentHash
                }
                return false
              })()

              return (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.url)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </button>
              )
            })}
          </div>

          {/* Settings Section */}
          <div className="mt-8">
            <h4 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Settings
            </h4>
            <div className="space-y-1">
              {settingsItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.url)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-8">
            <button
              onClick={() => handleNavigation('/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Rocket className="h-4 w-4" />
              <span>Try Now</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-border/40 p-4">
          <SignedIn>
            <div className="space-y-2">
              {/* User Info */}
              <div className="flex items-center gap-2 p-2">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8"
                    }
                  }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {user?.username ?? user?.primaryEmailAddress?.emailAddress}
                  </span>
                  {isLoadingStatus ? (
                    <Skeleton className="h-3 w-8" />
                  ) : isProUser ? (
                    <span className="text-xs text-primary font-semibold">PRO</span>
                  ) : null}
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="space-y-1">
                <button
                  onClick={() => window.open("https://billing.stripe.com/p/login/3cs7sw2s5dSieR224gg", "_blank")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Subscription</span>
                </button>
                <SignOutButton redirectUrl="/">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </SignOutButton>
              </div>
            </div>
          </SignedIn>
          
          <SignedOut>
            <SignInButton mode="modal">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <User className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  )
}
