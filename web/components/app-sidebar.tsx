"use client"

import {
  FileText,
  DollarSign,
  Settings,
  Home,
  Info,
  Sparkles,
  BookOpen,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar"
import { Logo } from "@/components/ui/logo"
import { useAuth, useUser, UserButton, SignOutButton, SignInButton } from "@clerk/nextjs"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SignedIn, SignedOut } from "@clerk/nextjs"
import React, { useState, useEffect } from "react"

// Define your actual navigation items
const mainItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "How It Works", url: "/#how-it-works", icon: Info },
  { title: "Features", url: "/#features", icon: Sparkles },
  { title: "Dashboard", url: "/dashboard", icon: FileText },
  { title: "Pricing", url: "/pricing", icon: DollarSign },
  { title: "Use Cases", url: "/#use-cases", icon: BookOpen }
]

// Define consistent styling for all sidebar elements
const SIDEBAR_STYLES = {
  button: {
    base: "w-full rounded-md transition-all duration-200 ease-in-out flex items-center gap-3 bg-transparent group-data-[collapsible=icon]:py-3",
    active: "border-l-2 border-accent text-accent-foreground font-medium pl-2 group-data-[collapsible=icon]:border-l-0",
    inactive: "text-foreground/70 pl-3 border-l-2 border-transparent group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:pl-0",
    overrides: "!bg-transparent hover:!bg-accent/10 active:!bg-transparent data-[active=true]:!bg-accent/10",
  },
  icon: {
    base: "h-5 w-5 shrink-0 transition-all duration-200 ease-in-out group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6",
    active: "text-accent-foreground",
    inactive: "text-foreground/70",
  },
  text: {
    base: "truncate group-data-[collapsible=icon]:!hidden",
    active: "font-medium",
    inactive: "font-normal",
  },
  transition: "transition-all duration-200 ease-in-out",
  hoverEffect: "hover:scale-105 hover:text-accent-foreground",
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { state, toggleSidebar } = useSidebar()
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()
  const [isProUser, setIsProUser] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  
  // State to track the current URL hash
  const [currentHash, setCurrentHash] = useState('');

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
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
        const response = await fetch(`${apiBaseUrl}/api/user/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error(`Status fetch error: ${response.status}`)
        const data = await response.json()
        if (isMounted) {
          setIsProUser(data.is_pro)
          setIsLoadingStatus(false)
        }
      } catch (err) {
        console.error("[AppSidebar] Failed to fetch user status:", err)
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
      // For home link, ensure hash is cleared completely
      router.push(url);
      // Reset hash state to empty
      setCurrentHash('');
      // If on the same page already, manually scroll to top for better UX
      if (pathname === '/') {
        window.scrollTo(0, 0);
      }
    } else if (url.includes('#')) {
      // For hash links, both update the URL and manually set the hash state
      const hash = url.substring(url.indexOf('#'));
      router.push(url);
      // Manually update our state to ensure it's in sync with URL
      setCurrentHash(hash);
    } else {
      // For normal page navigation, just use router.push
      router.push(url);
    }
  };

  // Effect to listen for hash changes (keep for direct hash changes or refreshes)
  useEffect(() => {
    const updateHash = () => {
      const newHash = window.location.hash;
      setCurrentHash(newHash);
    };

    // Set initial hash on mount
    updateHash();

    // Add listener for hash changes
    window.addEventListener('hashchange', updateHash);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('hashchange', updateHash);
    };
  }, []);

  // Debug - log sidebar state changes
  React.useEffect(() => {
    console.log("[AppSidebar] Current sidebar state:", state);
  }, [state]);

  // Define custom CSS to handle the specific styling issues
  const customStyles = `
    .sidebar-menu-button,
    .sidebar-menu-button:hover,
    .sidebar-menu-item button,
    .sidebar-menu-item a,
    [data-active="true"],
    button.peer,
    div[class*="SidebarMenuButton"],
    div[class*="SidebarMenuItem"],
    a[class*="SidebarMenuButton"],
    [class*="SidebarMenuButton_root"],
    [class*="SidebarMenuButton"]:not([data-active="false"]),
    [aria-current="page"],
    [aria-selected="true"],
    .peer\\/menu-button,
    .peer\\/menu-button:hover {
      background-color: transparent !important;
      background: transparent !important;
    }
    
    /* Target the ::before and ::after elements that might have background styles */
    [class*="SidebarMenuButton"]::before,
    [class*="SidebarMenuButton"]::after,
    .sidebar-menu-button::before,
    .sidebar-menu-button::after {
      background-color: transparent !important;
      background: transparent !important;
      display: none !important;
    }
    
    .sidebar-collapsed .logo-text {
      display: none;
    }

    /* Target any potential background elements */
    .w-full.rounded-md.flex.items-center {
      background-color: transparent !important;
    }
  `;

  return (
    <>
      {/* Add a style tag to the DOM */}
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      
      {/* Desktop sidebar toggle button - fixed position outside sidebar */}
      <div className="fixed top-4 z-50 hidden md:block" style={{
        left: state === 'expanded' 
          ? 'calc(var(--sidebar-width) - 0.75rem)' 
          : 'calc(var(--sidebar-width-icon) - 0.75rem)',
        transition: 'left 0.2s ease-linear'
      }}>
        <Button 
          variant="ghost"
          size="icon" 
          className={cn(
            "h-8 w-8 shadow-md rounded-md",
            SIDEBAR_STYLES.transition,
            SIDEBAR_STYLES.hoverEffect,
            "bg-secondary/90"
          )}
          onClick={toggleSidebar}
          aria-label={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {state === 'expanded' ? (
            <PanelLeftClose className={cn(SIDEBAR_STYLES.icon.base, "h-4 w-4")} />
          ) : (
            <PanelLeftOpen className={cn(SIDEBAR_STYLES.icon.base, "h-4 w-4")} />
          )}
        </Button>
      </div>

      <Sidebar
        collapsible="icon"
        variant="sidebar"
        className={cn(
          "border-r border-border/40",
          state === 'collapsed' && "sidebar-collapsed"
        )}
        data-state={state}
      >
        <SidebarHeader className="h-14 flex items-center justify-center px-4 border-b border-border/40">
          <Link href="/" className="focus-ring-animate relative focus:outline-none rounded-lg">
            <span className="font-semibold gradient-text text-lg logo-text group-data-[collapsible=icon]:hidden">
              Tildra
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-3 py-3 flex-1 overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupContent className="mt-1 space-y-1">
              <SidebarMenu>
                {mainItems.map((item) => {
                   const isActive = (() => {
                     // Use hash from state now
                     // Exact match for Home (only if path is / AND there's no hash from state)
                     if (item.url === "/" && currentHash === "") { 
                       const result = pathname === "/";
                       return result;
                     }
                     
                     // StartsWith for non-hash links (e.g., /dashboard)
                     if (!item.url.includes("#") && item.url !== "/") { 
                       const result = pathname.startsWith(item.url);
                       return result;
                     }
                     
                     // Check hash links: active if path is / AND hash from state matches item's hash
                     if (item.url.startsWith("/#") && pathname === "/") { 
                        const itemHash = item.url.substring(1); // Extract #hash from item.url
                        const result = itemHash === currentHash;
                        return result;
                     }

                     return false;
                   })();

                  return (
                    <SidebarMenuItem 
                      key={item.title} 
                      className={cn(
                        "group sidebar-menu-item",
                        state === 'collapsed' ? 'my-1.5' : 'my-1'
                      )}
                    >
                      <SidebarMenuButton
                        isActive={isActive}
                        className={cn(
                          SIDEBAR_STYLES.button.base,
                          SIDEBAR_STYLES.transition,
                          isActive
                            ? SIDEBAR_STYLES.button.active
                            : SIDEBAR_STYLES.button.inactive,
                          SIDEBAR_STYLES.button.overrides,
                          "sidebar-menu-button",
                          !isActive && "hover:text-accent-foreground",
                          state === 'collapsed' && "justify-center items-center p-0 gap-0"
                        )}
                        style={{ backgroundColor: 'transparent' }}
                        onClick={() => handleNavigation(item.url)}
                      >
                        <item.icon
                          className={cn(
                            SIDEBAR_STYLES.icon.base,
                            isActive
                              ? SIDEBAR_STYLES.icon.active
                              : SIDEBAR_STYLES.icon.inactive,
                            "group-hover:scale-110 group-data-[collapsible=icon]:group-hover:scale-125",
                            state === 'collapsed' && "mx-auto"
                          )}
                        />
                        <span className={cn(
                           SIDEBAR_STYLES.text.base,
                           isActive
                             ? SIDEBAR_STYLES.text.active
                             : SIDEBAR_STYLES.text.inactive
                         )}>
                          {item.title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className={cn(
          "p-3 border-t border-border/40 mt-auto",
          state === 'collapsed' && "flex flex-col items-center justify-start px-[10px] py-1"
        )}>
          {!isLoaded ? (
            <div className={cn("flex items-center gap-3 p-3", state === 'collapsed' && "justify-center p-0 py-3")}>
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className={cn("h-4 w-20", state === 'collapsed' && "hidden")} />
            </div>
          ) : (
            <>
              <SignedIn>
                <div className={cn("flex items-center gap-3 p-3", state === 'collapsed' && "justify-center p-0 py-3")}>
                  <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
                  <div className={cn("flex flex-col truncate", state === 'collapsed' && "hidden")}>
                    <span className="text-sm font-medium truncate">{user?.primaryEmailAddress?.emailAddress}</span>
                    {/* Pro Badge Logic (already re-added) */}
                    {isLoadingStatus ? (
                      <Skeleton className="h-3 w-8 mt-1" />
                    ) : isProUser ? (
                      <span className="pro-badge-animated mt-1">
                        <span>PRO</span>
                      </span>
                    ) : null}
                  </div>
                </div>
                {/* Manage Subscription Link */}
                <SidebarMenuItem className={cn(state === 'collapsed' && "px-0")}>
                  <a 
                    href="https://billing.stripe.com/p/login/test_dR64hffWb55Ze084gg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      SIDEBAR_STYLES.button.base,
                      SIDEBAR_STYLES.button.inactive, 
                      SIDEBAR_STYLES.button.overrides,
                      SIDEBAR_STYLES.hoverEffect,
                      SIDEBAR_STYLES.transition
                    )}
                    aria-label="Manage Subscription"
                  >
                    <Settings className={cn(SIDEBAR_STYLES.icon.base, SIDEBAR_STYLES.icon.inactive)} />
                    <span className={cn(SIDEBAR_STYLES.text.base, SIDEBAR_STYLES.text.inactive)}>Manage Subscription</span>
                  </a>
                </SidebarMenuItem>
                {/* Sign Out Button */}
                <SidebarMenuItem className={cn(state === 'collapsed' && "px-0")}> 
                  <SignOutButton redirectUrl="/">
                    <button className={cn(
                      SIDEBAR_STYLES.button.base,
                      SIDEBAR_STYLES.button.inactive, 
                      SIDEBAR_STYLES.button.overrides,
                      SIDEBAR_STYLES.hoverEffect,
                      SIDEBAR_STYLES.transition
                    )}>
                      <LogOut className={cn(SIDEBAR_STYLES.icon.base, SIDEBAR_STYLES.icon.inactive)} />
                      <span className={cn(SIDEBAR_STYLES.text.base, SIDEBAR_STYLES.text.inactive)}>Sign Out</span>
                    </button>
                  </SignOutButton>
                </SidebarMenuItem>
              </SignedIn>

              <SignedOut>
                {/* Sign In Button */}
                <SidebarMenuItem className={cn(state === 'collapsed' && "px-0")}>
                  <SignInButton mode="modal">
                    <button className={cn(
                      SIDEBAR_STYLES.button.base,
                      SIDEBAR_STYLES.button.inactive,
                      SIDEBAR_STYLES.button.overrides,
                      SIDEBAR_STYLES.hoverEffect,
                      SIDEBAR_STYLES.transition
                    )}>
                      <User className={cn(SIDEBAR_STYLES.icon.base, SIDEBAR_STYLES.icon.inactive)} />
                      <span className={cn(SIDEBAR_STYLES.text.base, SIDEBAR_STYLES.text.inactive)}>Sign In</span>
                    </button>
                  </SignInButton>
                </SidebarMenuItem>
              </SignedOut>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <SidebarTrigger className={cn(
            "rounded-md shadow-md p-2 bg-transparent",
            SIDEBAR_STYLES.transition,
            "hover:bg-accent/10 hover:text-accent-foreground hover:scale-105"
          )}>
            <PanelLeft className={cn(SIDEBAR_STYLES.icon.base, "group-hover:scale-110")} />
          </SidebarTrigger>
        </div>
      </Sidebar>
    </>
  )
}
