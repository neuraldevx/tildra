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
  PanelLeft,
  Rocket
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
  { title: "Dashboard", url: "/dashboard", icon: FileText },
  { title: "Features", url: "/#features", icon: Sparkles },
  { title: "About", url: "/#about", icon: Info },
  { title: "Testimonials", url: "/#testimonials", icon: User },
  { title: "Pricing", url: "/pricing", icon: DollarSign },
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
        
        // Add timeout for fetch requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch(`${apiBaseUrl}/api/user/status`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn(`Status fetch returned ${response.status}: ${response.statusText}`);
            // Don't throw, just handle gracefully
            if (isMounted) {
              setIsProUser(false);
              setIsLoadingStatus(false);
            }
            return;
          }
          
          const data = await response.json()
          if (isMounted) {
            setIsProUser(data.is_pro)
            setIsLoadingStatus(false)
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          console.warn("[AppSidebar] Fetch error:", fetchErr instanceof Error ? fetchErr.message : fetchErr);
          if (isMounted) {
            setIsProUser(false);
            setIsLoadingStatus(false);
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
      
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        className={cn(
          // Glassy, rounded, shadowed sidebar
          "border-r border-border/40 bg-white/80 dark:bg-black/60 backdrop-blur-xl rounded-xl shadow-xl transition-all duration-300",
          state === 'collapsed' && "sidebar-collapsed"
        )}
        data-state={state}
      >
        <SidebarHeader
          className={cn(
            "h-16 flex items-center border-b border-border/40",
            state === 'collapsed'
              ? 'justify-center px-0 cursor-pointer hover:bg-accent/10 active:bg-accent/20'
              : 'justify-between px-5 gap-2'
          )}
          onClick={state === 'collapsed' ? toggleSidebar : undefined}
          role={state === 'collapsed' ? "button" : undefined}
          aria-label={state === 'collapsed' ? "Expand sidebar" : "Sidebar header"}
          tabIndex={state === 'collapsed' ? 0 : undefined}
        >
          {state === 'collapsed' ? (
            <div className="p-2 rounded-md">
              <PanelLeftOpen className="h-5 w-5 text-foreground/80" />
            </div>
          ) : (
            <>
              <div className="flex-1"></div>
              <button
                onClick={() => toggleSidebar()}
                className={cn(
                  "h-9 w-9 rounded-full border border-transparent",
                  "flex items-center justify-center",
                  SIDEBAR_STYLES.transition,
                  "hover:border-border/40"
                )}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </>
          )}
        </SidebarHeader>

        <SidebarContent className="px-3 py-3 flex-1 overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupContent className="mt-1 space-y-2">
              <SidebarMenu>
                {mainItems.map((item) => {
                   const isActive = (() => {
                     if (item.url === "/" && currentHash === "") return pathname === "/";
                     if (!item.url.includes("#") && item.url !== "/") return pathname.startsWith(item.url);
                     if (item.url.startsWith("/#") && pathname === "/") {
                       const itemHash = item.url.substring(1);
                       return itemHash === currentHash;
                     }
                     return false;
                   })();

                  return (
                    <SidebarMenuItem 
                      key={item.title} 
                      className={cn(
                        "group sidebar-menu-item",
                        state === 'collapsed' ? 'my-2' : 'my-1.5'
                      )}
                    >
                      <SidebarMenuButton
                        isActive={isActive}
                        className={cn(
                          SIDEBAR_STYLES.button.base,
                          SIDEBAR_STYLES.transition,
                          isActive
                            ? "bg-accent/20 text-accent-foreground shadow-sm"
                            : "hover:bg-accent/10 hover:text-accent-foreground",
                          "rounded-full px-3 py-2",
                          state === 'collapsed' && "justify-center items-center p-0 gap-0"
                        )}
                        style={{ backgroundColor: 'transparent' }}
                        onClick={() => handleNavigation(item.url)}
                      >
                        <item.icon
                          className={cn(
                            SIDEBAR_STYLES.icon.base,
                            isActive
                              ? "text-accent-foreground"
                              : "text-foreground/70",
                            state === 'collapsed' && "mx-auto"
                          )}
                        />
                        <span className={cn(
                           SIDEBAR_STYLES.text.base,
                           isActive
                             ? "font-semibold"
                             : "font-normal"
                         )}>
                          {item.title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
                {/* Try Now CTA: pill button when expanded, icon button when collapsed */}
                <SidebarMenuItem className={cn("mt-4 flex justify-center")}> 
                  {state === 'collapsed' ? (
                    <Link href="/dashboard" passHref legacyBehavior>
                      <a className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 shadow-md hover:from-fuchsia-500 hover:to-primary transition-all duration-200 dark:from-purple-600 dark:to-pink-500 dark:hover:from-pink-500 dark:hover:to-purple-600">
                        <Rocket className="w-6 h-6 text-white" />
                      </a>
                    </Link>
                  ) : (
                    <Link href="/dashboard" passHref legacyBehavior>
                      <a className="w-full block text-center rounded-full bg-gradient-to-r from-primary to-fuchsia-500 text-white font-bold py-2 px-4 shadow-md hover:from-fuchsia-500 hover:to-primary transition-all duration-200 dark:from-purple-600 dark:to-pink-500 dark:hover:from-pink-500 dark:hover:to-purple-600">
                        Try Now
                      </a>
                    </Link>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className={cn(
          "border-t border-border/40 mt-auto pt-3 pb-2 px-3 bg-white/60 dark:bg-black/40 rounded-b-xl shadow-inner",
          state === 'collapsed'
            ? "flex items-center justify-center px-3 py-2 bg-transparent shadow-none"
            : ""
        )}>
          {!isLoaded ? (
            // Loading state: show placeholder avatar
            <Skeleton className="h-8 w-8 rounded-full mx-auto" />
          ) : state === 'collapsed' ? (
            // Collapsed state: only show user avatar centered
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: "h-8 w-8 mx-auto" } }}
            />
          ) : (
            // Expanded state: full footer with user info and links
            <>
              <SignedIn>
                <div className="flex items-center gap-3 p-3">
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{ elements: { avatarBox: "h-8 w-8" } }}
                  />
                  <div className="flex flex-col truncate">
                    <span className="text-sm font-medium truncate">
                      {user?.username ?? user?.primaryEmailAddress?.emailAddress}
                    </span>
                    {isLoadingStatus ? (
                      <Skeleton className="h-3 w-8 mt-1" />
                    ) : isProUser ? (
                      <span className="pro-badge-animated mt-1">
                        <span>PRO</span>
                      </span>
                    ) : null}
                  </div>
                </div>
                <SidebarMenuItem>
                  <a
                    href="https://billing.stripe.com/p/login/test_dR64hffWb55Ze084gg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      SIDEBAR_STYLES.button.base,
                      SIDEBAR_STYLES.button.inactive,
                      SIDEBAR_STYLES.button.overrides,
                      SIDEBAR_STYLES.transition
                    )}
                    aria-label="Subscription"
                  >
                    <Settings className={cn(SIDEBAR_STYLES.icon.base, SIDEBAR_STYLES.icon.inactive)} />
                    <span className={cn(SIDEBAR_STYLES.text.base, SIDEBAR_STYLES.text.inactive)}>
                      Subscription
                    </span>
                  </a>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SignOutButton redirectUrl="/">
                    <button
                      className={cn(
                        SIDEBAR_STYLES.button.base,
                        SIDEBAR_STYLES.button.inactive,
                        SIDEBAR_STYLES.button.overrides,
                        SIDEBAR_STYLES.transition
                      )}
                    >
                      <LogOut className={cn(SIDEBAR_STYLES.icon.base, SIDEBAR_STYLES.icon.inactive)} />
                      <span className={cn(SIDEBAR_STYLES.text.base, SIDEBAR_STYLES.text.inactive)}>
                        Sign Out
                      </span>
                    </button>
                  </SignOutButton>
                </SidebarMenuItem>
              </SignedIn>
              <SignedOut>
                <SidebarMenuItem>
                  <SignInButton mode="modal">
                    <button
                      className={cn(
                        SIDEBAR_STYLES.button.base,
                        SIDEBAR_STYLES.button.inactive,
                        SIDEBAR_STYLES.button.overrides,
                        SIDEBAR_STYLES.transition
                      )}
                    >
                      <User className={cn(SIDEBAR_STYLES.icon.base, SIDEBAR_STYLES.icon.inactive)} />
                      <span className={cn(SIDEBAR_STYLES.text.base, SIDEBAR_STYLES.text.inactive)}>
                        Sign In
                      </span>
                    </button>
                  </SignInButton>
                </SidebarMenuItem>
              </SignedOut>
            </>
          )}
        </div>
      </Sidebar>
    </>
  )
}
