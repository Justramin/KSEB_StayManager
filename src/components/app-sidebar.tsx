"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Bed,
  Calendar,
  History,
  FileText,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  Menu,
  Users,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-500",
  },
  {
    title: "Rooms",
    url: "/rooms",
    icon: Bed,
    color: "text-emerald-500",
  },
  {
    title: "Bookings",
    url: "/bookings",
    icon: Calendar,
    color: "text-amber-500",
  },
  {
    title: "Dormitories",
    url: "/dormitories",
    icon: Building2,
    color: "text-violet-500",
  },
  {
    title: "Dorm Calendar",
    url: "/dormitory-calendar",
    icon: Calendar,
    color: "text-cyan-500",
  },
  {
    title: "Attendance",
    url: "/attendance",
    icon: Users,
    color: "text-pink-500",
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
    color: "text-indigo-500",
  },
  {
    title: "History",
    url: "/history",
    icon: History,
    color: "text-slate-500",
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
    color: "text-rose-500",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 dark:border-white/5">
      <SidebarHeader className="py-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Building2 className="size-6" />
                </div>
                {!isCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-0.5 leading-none"
                  >
                    <span className="font-bold text-lg tracking-tight">StayManager</span>
                    <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground/60">Management Suite</span>
                  </motion.div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="px-3">
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const isActive = pathname === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className={cn(
                    "relative h-11 transition-all duration-200 group overflow-hidden",
                    isActive 
                      ? "bg-primary/10 text-primary hover:bg-primary/15" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <Link href={item.url} className="flex items-center gap-3">
                    <item.icon className={cn("size-5 transition-colors", isActive ? item.color : "text-muted-foreground group-hover:text-foreground")} />
                    <span className={cn("font-medium", !isActive && "text-muted-foreground group-hover:text-foreground")}>
                      {item.title}
                    </span>
                    {isActive && (
                      <motion.div 
                        layoutId="active-nav"
                        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className={cn(
          "rounded-2xl bg-muted/30 p-2 transition-all",
          isCollapsed ? "items-center" : "items-start"
        )}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Settings" className="hover:bg-muted/50">
                <Settings className="size-5 text-muted-foreground" />
                {!isCollapsed && <span className="font-medium text-muted-foreground">Settings</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Logout" className="hover:bg-rose-500/10 hover:text-rose-500 group">
                <LogOut className="size-5 text-muted-foreground group-hover:text-rose-500" />
                {!isCollapsed && <span className="font-medium text-muted-foreground group-hover:text-rose-500">Logout</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
