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
  PanelLeft
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
  SidebarSeparator
} from "@/components/ui/sidebar"
import { LogoIcon } from "@/components/ui/logo-icon"
import { useUser, UserButton, SignOutButton } from "@clerk/nextjs"
import { Skeleton } from "@/components/ui/skeleton"

// Define your actual navigation items
const mainItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "How It Works", url: "/#how-it-works", icon: Info },
  { title: "Features", url: "/#features", icon: Sparkles },
  { title: "Dashboard", url: "/dashboard", icon: FileText },
  { title: "Pricing", url: "/pricing", icon: DollarSign },
  { title: "Use Cases", url: "/#use-cases", icon: BookOpen }
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const { isLoaded, isSignedIn, user } = useUser()

  return (
    <Sidebar className="border-r border-sidebar-border/80 transition-all duration-300 ease-in-out" collapsible="icon">
      <SidebarHeader className="h-14 flex items-center justify-center border-b border-sidebar-border/80">
        <div className="flex items-center justify-center w-full">
          <LogoIcon size={32} />
          <span 
            className="ml-2 font-semibold text-lg transition-opacity duration-200 ease-in-out whitespace-nowrap"
            style={{ opacity: state === "collapsed" ? 0 : 1 }}
          >
            Tildra
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-auto py-2 px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive = item.url === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.url.split("#")[0]) && item.url !== "/"

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="group-data-[collapsible=icon]:justify-center transition-all duration-150"
                    >
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5 flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
                        <span 
                          className="transition-opacity duration-200 ease-in-out whitespace-nowrap"
                          style={{ opacity: state === "collapsed" ? 0 : 1 }}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter className="mt-auto p-2">
        {!isLoaded ? (
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1 group-data-[collapsible=icon]:hidden" />
          </div>
        ) : isSignedIn ? (
          <div className="flex items-center gap-2 p-2">
            <UserButton afterSignOutUrl="/" />
            <div 
              className="flex flex-col transition-opacity duration-200 ease-in-out whitespace-nowrap"
              style={{ opacity: state === "collapsed" ? 0 : 1 }}
            >
              <span className="text-sm font-medium truncate">
                {user?.firstName ?? user?.username ?? 'User'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
            <SignOutButton>
              <button 
                className="ml-auto p-1 rounded-md hover:bg-sidebar-accent transition-opacity duration-200 ease-in-out"
                style={{ opacity: state === "collapsed" ? 0 : 1 }} 
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4"/>
              </button>
            </SignOutButton>
          </div>
        ) : (
          <SidebarMenuButton 
            asChild 
            className="group-data-[collapsible=icon]:justify-center"
            tooltip="Sign In"
          >
            <Link href="/sign-in">
              <User className="h-5 w-5"/>
              <span 
                className="transition-opacity duration-200 ease-in-out whitespace-nowrap"
                style={{ opacity: state === "collapsed" ? 0 : 1 }}
              >Sign In</span>
            </Link>
          </SidebarMenuButton>
        )}
      </SidebarFooter>

      <div className="fixed top-4 left-4 z-50 md:hidden">
        <SidebarTrigger className="bg-card rounded-md shadow-md p-2">
          <PanelLeft className="h-5 w-5"/>
        </SidebarTrigger>
      </div>
    </Sidebar>
  )
}
