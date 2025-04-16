"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Use more compact width constants
const SIDEBAR_WIDTH = "15rem"
const SIDEBAR_WIDTH_MOBILE = "16rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

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
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
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
      },
      [setOpenProp, open]
    )

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    const state = open ? "expanded" : "collapsed"

    // DEBUG: Log state change in Provider
    React.useEffect(() => {
      console.log("[SidebarProvider] State changed:", state);
    }, [state]);

    const contextValue = React.useMemo<SidebarContextProps>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          style={{
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties}
          className={cn(
            "relative flex min-h-screen w-full",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

// Simplified Sidebar component that works better with collapsed states
const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right"
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none"
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === "collapsed";

    // DEBUG: Log state and collapsible status inside Sidebar
    React.useEffect(() => {
      console.log(`[Sidebar] Render/Update - State: ${state}, IsCollapsed: ${isCollapsed}, Collapsible: ${collapsible}`);
    }, [state, isCollapsed, collapsible]);

    const width = isCollapsed && collapsible === "icon"
      ? "var(--sidebar-width-icon)"
      : "var(--sidebar-width)";

    // DEBUG: Log calculated width
    React.useEffect(() => {
      console.log(`[Sidebar] Calculated Width: ${width}`);
    }, [width]);

    return (
      <div
        ref={ref}
        className={cn(
          "sticky top-0 h-screen border-r",
          "bg-sidebar text-sidebar-foreground",
          "transition-[width] duration-200 ease-linear",
          className
        )}
        data-state={state}
        data-collapsible={isCollapsed ? collapsible : undefined}
        data-variant={variant}
        data-side={side}
        style={{ width }}
        {...props}
      >
        <div className="h-full flex flex-col overflow-hidden">{children}</div>
      </div>
    );
  }
);
Sidebar.displayName = "Sidebar"

// Simplified SidebarTrigger
const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, children, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      {children || <PanelLeft className="h-[1.2rem] w-[1.2rem]" />}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

// Simple content/header/footer components
const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-none p-4", className)}
    {...props}
  />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-auto px-2 py-4", className)}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

// Add SidebarInset component
const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, style, children, ...props }, ref) => {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Determine margin based on state and screen size
  const marginLeft = isMobile
    ? '0' // No margin on mobile as sidebar likely overlays or is hidden
    : isCollapsed
      ? 'var(--sidebar-width-icon)'
      : 'var(--sidebar-width)';

  // DEBUG: Log state and margin in Inset
  React.useEffect(() => {
    console.log(`[SidebarInset] Render/Update - State: ${state}, IsCollapsed: ${isCollapsed}, IsMobile: ${isMobile}, Calculated marginLeft: ${marginLeft}`);
  }, [state, isCollapsed, isMobile, marginLeft]);

  return (
    <div
      ref={ref}
      style={{
        marginLeft: marginLeft, // Apply margin here
        transition: 'margin-left 0.2s ease-linear', // Add transition
        ...style,
      }}
      className={cn("flex flex-col flex-1", className)} // Ensure it grows
      {...props}
    >
      {children}
    </div>
  );
});
SidebarInset.displayName = "SidebarInset";

// Add SidebarRail component (basic implementation)
const SidebarRail = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // Basic styling, adjust as needed for icon rail functionality
    className={cn("flex-none border-t", className)}
    {...props}
  />
))
SidebarRail.displayName = "SidebarRail"

// Export other sidebar components
const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col", className)}
    {...props}
  />
))
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"
  return (
    <Comp
      ref={ref}
      className={cn(
        "px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-col", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("flex my-1", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: {
      content: string
      side?: "top" | "right" | "bottom" | "left"
      align?: "start" | "center" | "end"
    }
  }
>(({ className, asChild = false, isActive, tooltip, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      ref={ref}
      data-active={isActive ? true : undefined}
      className={cn(
        "peer/menu-button flex w-full items-center gap-x-3 rounded-md px-3 py-2 text-sm font-medium",
        "text-sidebar-foreground/80 transition-all duration-200 ease-in-out",
        "hover:text-sidebar-foreground hover:bg-sidebar-accent/80 active:opacity-80",
        "data-[active=true]:bg-white/5 data-[active=true]:text-sidebar-foreground",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

export {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
}
