"use client"

import { useState, useEffect } from "react"
import { StatsCard } from "@/components/stats-card"
import {
  Bed,
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Users,
  ArrowRight,
  TrendingUp,
  Activity,
  Building2,
  FileText,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion } from "framer-motion"
import Link from "next/link"

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    bookedRooms: 0,
    hallBookingsToday: 0,
    todayBookings: 0,
    upcomingBookings: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const { count: totalRooms } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)

      const { count: availableRooms } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("current_status", "available")
        .eq("is_active", true)

      const { count: bookedRooms } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("current_status", "booked")
        .eq("is_active", true)

      const today = new Date().toISOString().split("T")[0]

      const { count: hallBookingsToday } = await supabase
        .from("hall_bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_date", today)

      const { count: upcomingBookings } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("check_in_date", today)
        .eq("status", "pending")

      setStats({
        totalRooms: totalRooms || 0,
        availableRooms: availableRooms || 0,
        bookedRooms: bookedRooms || 0,
        hallBookingsToday: hallBookingsToday || 0,
        todayBookings: 0, // Logic for today's room bookings
        upcomingBookings: upcomingBookings || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <h2 className="text-4xl font-extrabold tracking-tight">
            Dashboard
          </h2>
          <p className="text-muted-foreground font-medium">
            Welcome back! Here's what's happening at <span className="text-primary font-bold">StayManager</span> today.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Button variant="outline" className="rounded-xl font-semibold border-2 h-11 px-6">
            View Analytics
          </Button>
          <Button className="rounded-xl font-bold shadow-lg shadow-primary/25 h-11 px-6" asChild>
            <Link href="/bookings">
              New Booking <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatsCard
          title="Total Rooms"
          value={stats.totalRooms}
          icon={Bed}
          description="Managed properties"
          trend={{ value: "12%", positive: true }}
          delay={0.1}
        />
        <StatsCard
          title="Available Now"
          value={stats.availableRooms}
          icon={CheckCircle2}
          description="Ready for check-in"
          trend={{ value: "5%", positive: false }}
          className="border-emerald-500/20 dark:border-emerald-500/10"
          delay={0.2}
        />
        <StatsCard
          title="Currently Booked"
          value={stats.bookedRooms}
          icon={Clock}
          description="Occupied rooms"
          trend={{ value: "8%", positive: true }}
          delay={0.3}
        />
        <StatsCard
          title="Hall Events Today"
          value={stats.hallBookingsToday}
          icon={Users}
          description="Scheduled events"
          trend={{ value: "2", positive: true }}
          delay={0.4}
        />
        <StatsCard
          title="Upcoming Stays"
          value={stats.upcomingBookings}
          icon={CalendarDays}
          description="Next 7 days"
          trend={{ value: "14%", positive: true }}
          delay={0.5}
        />
        <StatsCard
          title="Occupancy Rate"
          value={`${stats.totalRooms > 0 ? Math.round((stats.bookedRooms / stats.totalRooms) * 100) : 0}%`}
          icon={TrendingUp}
          description="Live capacity"
          trend={{ value: "3%", positive: true }}
          delay={0.6}
        />
      </motion.div>

      <div className="grid gap-6 md:grid-cols-7">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="md:col-span-4"
        >
          <Card className="glass-card border-none h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
                <CardDescription>Live updates from your property</CardDescription>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 group cursor-pointer">
                    <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <Clock className="size-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-bold leading-none">New Room Booking</p>
                      <p className="text-xs text-muted-foreground">Customer: John Doe &bull; Room 302</p>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      2 mins ago
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-6 rounded-xl font-bold text-primary hover:bg-primary/10">
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="md:col-span-3"
        >
          <Card className="bg-linear-to-br from-primary to-blue-600 text-primary-foreground border-none overflow-hidden relative h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
              <Building2 size={120} />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-primary-foreground/70">Common management tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <Button className="w-full justify-start gap-3 h-12 bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl font-bold backdrop-blur-sm transition-all hover:translate-x-1">
                <Bed className="size-5" /> Add New Room
              </Button>
              <Button className="w-full justify-start gap-3 h-12 bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl font-bold backdrop-blur-sm transition-all hover:translate-x-1">
                <CalendarDays className="size-5" /> Schedule Event
              </Button>
              <Button className="w-full justify-start gap-3 h-12 bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl font-bold backdrop-blur-sm transition-all hover:translate-x-1">
                <FileText className="size-5" /> Generate Report
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
