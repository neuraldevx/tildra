"use client"

import { Home, FileText, BookOpen, Info, DollarSign, Sparkles } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

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
} from "@/components/ui/sidebar-fixed"

// Menu items with icons that match their purpose
const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "How It Works", url: "/#how-it-works", icon: Info },
  { title: "Features", url: "/#features", icon: Sparkles },
  { title: "Summarizer", url: "/summarizer", icon: FileText },
  { title: "Pricing", url: "/pricing", icon: DollarSign },
  { title: "Use Cases", url: "/#use-cases", icon: BookOpen }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="hidden md:block"
    >
      <SidebarHeader className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Logo size="sm" />
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">Tildra</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 py-1 text-xs font-medium uppercase group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2 space-y-1.5">
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.url === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.url.split("#")[0]);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5 flex-shrink-0 text-current/70" />
                        <span className="group-data-[collapsible=icon]:hidden truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
