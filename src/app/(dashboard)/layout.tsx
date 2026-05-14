import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Bell, Search, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-white/10 dark:border-white/5 bg-background/50 backdrop-blur-xl px-6 sticky top-0 z-40">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1 hidden md:flex max-w-md">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                placeholder="Search anything..." 
                className="w-full h-10 bg-muted/30 border-none rounded-xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-hidden"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <Button variant="ghost" size="icon" className="rounded-xl relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-background" />
            </Button>
            <ThemeToggle />
            <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />
            <Button variant="ghost" className="gap-2 px-2 hover:bg-muted/50 rounded-xl">
              <div className="size-8 rounded-lg bg-linear-to-br from-primary to-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                JD
              </div>
              <span className="text-sm font-semibold hidden sm:inline-block">John Doe</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scroll-smooth">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
