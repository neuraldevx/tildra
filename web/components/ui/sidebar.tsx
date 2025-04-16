"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SIDEBAR_WIDTH = "16rem" // 256px
const SIDEBAR_WIDTH_MOBILE = "18rem" // 288px
const SIDEBAR_WIDTH_ICON = "4.5rem" // 72px
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }, ref) => {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open],
  )

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContext>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar", className)}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
})
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    variant?: "sidebar" | "inset"
    collapsible?: "icon" | "button"
  }
>(({ variant = "sidebar", collapsible, className, children, ...props }, ref) => {
  const { open, setOpen, state, isMobile, openMobile, setOpenMobile } = useSidebar()

  // Handle mobile overlay close
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setOpenMobile(false)
    }
  }

  if (isMobile) {
    return (
      <>
        {openMobile && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            onClick={handleOverlayClick}
          />
        )}
        <div
          data-state={openMobile ? "open" : "closed"}
          data-variant={variant}
          data-sidebar="sidebar"
          data-collapsible={collapsible}
          style={{ width: SIDEBAR_WIDTH_MOBILE }} // Use mobile width
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-transform duration-300 ease-in-out",
            "data-[state=closed]:-translate-x-full",
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </>
    )
  }

  // Desktop view
  return (
    <div
      data-state={state}
      data-variant={variant}
      data-sidebar="sidebar"
      data-collapsible={collapsible}
      style={{ width: collapsible === "icon" && state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width)" }}
      className={cn("flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground", className)}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
})
Sidebar.displayName = "Sidebar"

const SidebarRail = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  // Remove collapsible from context destructuring
  const { state } = useSidebar()

  // Note: This component might need the actual collapsible prop passed 
  // down if its rendering depends on it, but the original example 
  // didn't seem to use it here, so we remove it from context for now.
  // if (collapsible !== "button") return null 

  return (
    <div
      data-state={state}
      data-sidebar="rail"
      className={cn("flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground", className)}
      ref={ref}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="header" className={cn("flex items-center", className)} ref={ref} {...props} />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="content" className={cn("flex-1 overflow-y-auto", className)} ref={ref} {...props} />
))
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="footer" className={cn("flex shrink-0 items-center", className)} ref={ref} {...props} />
))
SidebarFooter.displayName = "SidebarFooter"

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & { collapsible?: "icon" | "button" }>(({ className, style, collapsible: collapsibleProp, ...props }, ref) => {
  const { state, isMobile } = useSidebar()

  // No inset effect on mobile
  if (isMobile) {
    return <div className={cn("flex-1 overflow-auto", className)} style={style} ref={ref} {...props} />
  }

  return (
    <div
      data-state={state}
      data-variant="inset" // Identify this component for styling
      style={
        {
          marginLeft:
            collapsibleProp === "icon" && state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width)",
          ...style,
        } as React.CSSProperties
      }
      className={cn("flex-1 overflow-auto transition-all duration-300 ease-in-out", className)}
      ref={ref}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

const SidebarTrigger = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, children, ...props }, ref) => {
  const { isMobile, toggleSidebar } = useSidebar()

  if (!isMobile) return null // Only render trigger on mobile

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("flex items-center justify-center", className)}
      onClick={toggleSidebar}
      ref={ref}
      {...props}
    >
      {/* Default Icon - can be replaced via children */}
      {children ?? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l16 0" />
          <path d="M4 12l16 0" />
          <path d="M4 18l16 0" />
        </svg>
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarSeparator = React.forwardRef<HTMLHRElement, React.ComponentProps<"hr">>(({ className, ...props }, ref) => (
  <hr className={cn("border-t border-sidebar-border", className)} ref={ref} {...props} />
))
SidebarSeparator.displayName = "SidebarSeparator"

// --- Menu Components ---

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="group" className={cn("flex flex-col", className)} ref={ref} {...props} />
))
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="group-label" className={cn("px-4 py-2 text-xs font-medium uppercase tracking-wider", className)} ref={ref} {...props} />
))
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="group-content" className={cn("mt-1", className)} ref={ref} {...props} />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="menu" className={cn("space-y-1", className)} ref={ref} {...props} />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="menu-item" className={cn("relative", className)} ref={ref} {...props} />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

interface SidebarMenuButtonProps extends ButtonProps {
  isActive?: boolean
  tooltip?: React.ReactNode
  asChild?: boolean
}

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ className, isActive, tooltip, asChild, children, ...props }, ref) => {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const ButtonComponent = (
    <Button
      variant="ghost"
      size="sm"
      data-sidebar="menu-button"
      data-active={isActive ? "true" : undefined}
      className={cn(
        "flex h-9 w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium",
        "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "data-[active]:bg-sidebar-primary/10 data-[active]:text-sidebar-primary data-[active]:font-semibold",
        isCollapsed && "justify-center px-0",
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </Button>
  )

  if (isCollapsed && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild={asChild}>{ButtonComponent}</TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    )
  }

  if (asChild) {
    return ButtonComponent // If asChild, the button props are passed to the child, often a Link
  }

  return ButtonComponent
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuSub = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="menu-sub" className={cn("ml-4 space-y-0.5 border-l border-sidebar-border pl-3 py-1", className)} ref={ref} {...props} />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div data-sidebar="menu-sub-item" className={cn("relative", className)} ref={ref} {...props} />
))
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

interface SidebarMenuSubButtonProps extends ButtonProps {
  isActive?: boolean
  asChild?: boolean
}

const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuSubButtonProps
>(({ className, isActive, asChild, children, ...props }, ref) => {

  const ButtonComponent = (
    <Button
      variant="ghost"
      size="sm"
      data-sidebar="menu-sub-button"
      data-active={isActive ? "true" : undefined}
      className={cn(
        "flex h-8 w-full items-center justify-start gap-2 rounded-md px-3 py-1.5 text-sm font-normal",
        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "data-[active]:text-sidebar-primary data-[active]:font-medium",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </Button>
  )
  
  if (asChild) {
    return ButtonComponent
  }

  return ButtonComponent
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarProvider,
  SidebarRail,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
}
