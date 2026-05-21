"use client"

import { useState, useEffect } from "react"
import { StatsCard } from "@/components/stats-card"
import {
  Bed,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  Building2,
  Users,
  CalendarDays,
  FileText,
  UserCheck,
  UserX,
  CreditCard,
  Sparkles,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const supabase = createClient()
  
  // Dashboard view mode
  const [activeTab, setActiveTab] = useState<"hotel" | "dormitory" | "attendance">("hotel")
  
  // Filters for details list
  const [roomFilter, setRoomFilter] = useState<"all" | "available" | "occupied">("all")
  const [bedFilter, setBedFilter] = useState<"all" | "available" | "checked_in" | "booked" | "cleaning">("all")
  const [staffFilter, setStaffFilter] = useState<"all" | "present" | "absent">("all")
  
  // Data state
  const [rooms, setRooms] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [hallBookingsCount, setHallBookingsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hall_bookings' }, () => fetchDashboardData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      // 1. Fetch Rooms
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
      setRooms(roomsData || [])

      // 2. Fetch Bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
      setBookings(bookingsData || [])

      // 3. Fetch Beds
      const { data: bedsData } = await supabase
        .from("beds")
        .select("*")
        .eq("is_active", true)
      setBeds(bedsData || [])

      // 4. Fetch Staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("*")
        .eq("is_active", true)
      setStaff(staffData || [])

      // 5. Fetch Today's Attendance
      const todayStr = new Date().toISOString().split("T")[0]
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", todayStr)
      setAttendance(attendanceData || [])

      // 6. Fetch Hall Bookings Count
      const { count } = await supabase
        .from("hall_bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_date", todayStr)
      setHallBookingsCount(count || 0)

    } catch (err) {
      console.error("Error loading dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Derived Stats - Rooms
  const totalRooms = rooms.length
  const availableRooms = rooms.filter(r => r.current_status === "available").length
  const occupiedRooms = rooms.filter(r => ["booked", "checked_in", "checked_out", "cleaning"].includes(r.current_status)).length
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  // Derived Stats - Beds
  const totalBeds = beds.length
  const availableBeds = beds.filter(b => b.current_status === "available").length
  const occupiedBeds = beds.filter(b => b.current_status === "checked_in").length
  const reservedBeds = beds.filter(b => b.current_status === "booked").length
  const cleaningBeds = beds.filter(b => b.current_status === "cleaning").length
  const bedOccupancyRate = totalBeds > 0 ? Math.round(((occupiedBeds + reservedBeds) / totalBeds) * 100) : 0

  // Derived Stats - Staff Today
  const totalStaff = staff.length
  const presentStaff = attendance.filter(a => a.status === "present").length
  const absentStaff = attendance.filter(a => a.status === "absent").length
  const unsubmittedStaff = totalStaff - (presentStaff + absentStaff)
  const attendanceRate = totalStaff > 0 ? Math.round((presentStaff / totalStaff) * 100) : 0

  // Filtered lists for detail displays
  const getFilteredRooms = () => {
    if (roomFilter === "available") return rooms.filter(r => r.current_status === "available")
    if (roomFilter === "occupied") return rooms.filter(r => r.current_status !== "available")
    return rooms
  }

  const getFilteredBeds = () => {
    if (bedFilter === "available") return beds.filter(b => b.current_status === "available")
    if (bedFilter === "checked_in") return beds.filter(b => b.current_status === "checked_in")
    if (bedFilter === "booked") return beds.filter(b => b.current_status === "booked")
    if (bedFilter === "cleaning") return beds.filter(b => b.current_status === "cleaning")
    return beds
  }

  const getFilteredStaff = () => {
    return staff.map(s => {
      const record = attendance.find(a => a.staff_id === s.id)
      return {
        ...s,
        status: record ? record.status : "Not Marked"
      }
    }).filter(s => {
      if (staffFilter === "present") return s.status === "present"
      if (staffFilter === "absent") return s.status === "absent"
      return true
    })
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      booked: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      checked_in: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      checked_out: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      cleaning: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      present: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      absent: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      "Not Marked": "bg-slate-500/10 text-slate-600 dark:text-slate-400"
    }
    return (
      <Badge variant="outline" className={cn("rounded-lg px-2.5 py-1 capitalize font-bold", map[status] || "")}>
        {status.replace("_", " ")}
      </Badge>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            StayManager Dashboard
          </h2>
          <p className="text-muted-foreground font-medium">
            Live analytics and business operations hub for KSEB.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl font-bold border-2 h-11 px-6 shadow-sm hover:bg-muted/30" asChild>
            <Link href="/reports">
              <FileText className="mr-2 h-4 w-4 text-rose-500" /> Export Reports
            </Link>
          </Button>
          <Button className="rounded-xl font-bold shadow-lg shadow-primary/25 h-11 px-6" asChild>
            <Link href="/bookings">
              Quick Booking <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Module tab toggler */}
      <div className="flex border-b border-white/10 dark:border-white/5 pb-1 gap-6">
        <button
          onClick={() => setActiveTab("hotel")}
          className={cn(
            "text-lg font-bold pb-2 relative transition-all duration-300",
            activeTab === "hotel" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Hotel Management
          {activeTab === "hotel" && (
            <motion.div layoutId="dash-active-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("dormitory")}
          className={cn(
            "text-lg font-bold pb-2 relative transition-all duration-300",
            activeTab === "dormitory" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Dormitory Modules
          {activeTab === "dormitory" && (
            <motion.div layoutId="dash-active-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={cn(
            "text-lg font-bold pb-2 relative transition-all duration-300",
            activeTab === "attendance" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Staff & Attendance
          {activeTab === "attendance" && (
            <motion.div layoutId="dash-active-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* MAIN CARDS ROW */}
      <AnimatePresence mode="wait">
        {activeTab === "hotel" && (
          <motion.div
            key="hotel-cards"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <StatsCard
              title="Total Rooms"
              value={totalRooms}
              icon={Bed}
              description="Managed rooms"
              className={cn(roomFilter === "all" ? "ring-2 ring-primary bg-primary/[0.03]" : "bg-card")}
              onClick={() => setRoomFilter("all")}
            />
            <StatsCard
              title="Available Rooms"
              value={availableRooms}
              icon={CheckCircle2}
              description="Ready to check-in"
              className={cn(
                "border-emerald-500/20 dark:border-emerald-500/10",
                roomFilter === "available" ? "ring-2 ring-emerald-500 bg-emerald-500/[0.03]" : "bg-card"
              )}
              onClick={() => setRoomFilter("available")}
            />
            <StatsCard
              title="Occupied Rooms"
              value={occupiedRooms}
              icon={Clock}
              description={`${occupancyRate}% occupancy capacity`}
              className={cn(
                "border-amber-500/20 dark:border-amber-500/10",
                roomFilter === "occupied" ? "ring-2 ring-amber-500 bg-amber-500/[0.03]" : "bg-card"
              )}
              onClick={() => setRoomFilter("occupied")}
            />
          </motion.div>
        )}

        {activeTab === "dormitory" && (
          <motion.div
            key="dorm-cards"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          >
            <StatsCard
              title="Total Beds"
              value={totalBeds}
              icon={Building2}
              description="Across all dormitories"
              className={cn(bedFilter === "all" ? "ring-2 ring-primary bg-primary/[0.03]" : "bg-card")}
              onClick={() => setBedFilter("all")}
            />
            <StatsCard
              title="Available Beds"
              value={availableBeds}
              icon={CheckCircle2}
              description="Ready for booking"
              className={cn(
                "border-emerald-500/20 dark:border-emerald-500/10",
                bedFilter === "available" ? "ring-2 ring-emerald-500 bg-emerald-500/[0.03]" : "bg-card"
              )}
              onClick={() => setBedFilter("available")}
            />
            <StatsCard
              title="Occupied Beds"
              value={occupiedBeds}
              icon={Clock}
              description="Checked-in guests"
              className={cn(
                "border-blue-500/20 dark:border-blue-500/10",
                bedFilter === "checked_in" ? "ring-2 ring-blue-500 bg-blue-500/[0.03]" : "bg-card"
              )}
              onClick={() => setBedFilter("checked_in")}
            />
            <StatsCard
              title="Reserved Beds"
              value={reservedBeds}
              icon={CalendarDays}
              description="Booked spaces"
              className={cn(
                "border-amber-500/20 dark:border-amber-500/10",
                bedFilter === "booked" ? "ring-2 ring-amber-500 bg-amber-500/[0.03]" : "bg-card"
              )}
              onClick={() => setBedFilter("booked")}
            />
            <StatsCard
              title="Cleaning Beds"
              value={cleaningBeds}
              icon={Sparkles}
              description="Beds being cleaned"
              className={cn(
                "border-rose-500/20 dark:border-rose-500/10",
                bedFilter === "cleaning" ? "ring-2 ring-rose-500 bg-rose-500/[0.03]" : "bg-card"
              )}
              onClick={() => setBedFilter("cleaning")}
            />
          </motion.div>
        )}

        {activeTab === "attendance" && (
          <motion.div
            key="attendance-cards"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <StatsCard
              title="Total Staff Members"
              value={totalStaff}
              icon={Users}
              description="Active employees"
              className={cn(staffFilter === "all" ? "ring-2 ring-primary bg-primary/[0.03]" : "bg-card")}
              onClick={() => setStaffFilter("all")}
            />
            <StatsCard
              title="Present Today"
              value={presentStaff}
              icon={UserCheck}
              description={`${attendanceRate}% attendance rate`}
              className={cn(
                "border-emerald-500/20 dark:border-emerald-500/10",
                staffFilter === "present" ? "ring-2 ring-emerald-500 bg-emerald-500/[0.03]" : "bg-card"
              )}
              onClick={() => setStaffFilter("present")}
            />
            <StatsCard
              title="Absent Today"
              value={absentStaff}
              icon={UserX}
              description={`${unsubmittedStaff} not marked yet`}
              className={cn(
                "border-rose-500/20 dark:border-rose-500/10",
                staffFilter === "absent" ? "ring-2 ring-rose-500 bg-rose-500/[0.03]" : "bg-card"
              )}
              onClick={() => setStaffFilter("absent")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER DETAILS VIEW */}
      <div className="grid gap-6 md:grid-cols-7">
        
        {/* Left Column: Filtered List */}
        <Card className="md:col-span-4 glass-card border-none overflow-hidden flex flex-col">
          <CardHeader className="py-6 border-b border-white/10 dark:border-white/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                {activeTab === "hotel" && `Filtered Hotel Rooms (${roomFilter.toUpperCase()})`}
                {activeTab === "dormitory" && `Filtered Dormitory Beds (${bedFilter.toUpperCase()})`}
                {activeTab === "attendance" && `Staff Attendance Status (${staffFilter.toUpperCase()})`}
              </CardTitle>
              <CardDescription>Click stats cards above to filter this list</CardDescription>
            </div>
            {activeTab === "hotel" && (
              <Button size="sm" className="rounded-xl font-bold" asChild>
                <Link href="/rooms">Manage Rooms</Link>
              </Button>
            )}
            {activeTab === "dormitory" && (
              <Button size="sm" className="rounded-xl font-bold" asChild>
                <Link href="/dormitories">Dorm Grid</Link>
              </Button>
            )}
            {activeTab === "attendance" && (
              <Button size="sm" className="rounded-xl font-bold" asChild>
                <Link href="/attendance">Mark Attendance</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-y-auto max-h-[400px]">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="py-20 text-center text-muted-foreground">Loading details...</div>
              ) : (
                <div className="space-y-3">
                  
                  {/* Hotel Room List */}
                  {activeTab === "hotel" && getFilteredRooms().map((room) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 bg-muted/20 hover:bg-muted/40 rounded-xl border border-white/5 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {room.room_number}
                        </div>
                        <div>
                          <div className="font-bold">Room {room.room_number}</div>
                          <div className="text-xs text-muted-foreground font-semibold">
                            {room.has_attached_bathroom ? "Deluxe Room" : "Standard Room"}
                          </div>
                        </div>
                      </div>
                      <div>{getStatusBadge(room.current_status)}</div>
                    </motion.div>
                  ))}
                  {activeTab === "hotel" && getFilteredRooms().length === 0 && (
                    <div className="py-20 text-center text-muted-foreground">No rooms in this category.</div>
                  )}

                  {/* Dorm Bed List */}
                  {activeTab === "dormitory" && getFilteredBeds().map((bed) => (
                    <motion.div
                      key={bed.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 bg-muted/20 hover:bg-muted/40 rounded-xl border border-white/5 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center font-bold text-purple-600">
                          {bed.bed_number}
                        </div>
                        <div>
                          <div className="font-bold">Bed {bed.bed_number}</div>
                          <div className="text-xs text-muted-foreground font-semibold">
                            {bed.dormitory_id === "d1" ? "Gents Dormitory" : "Ladies Dormitory"} &bull; Row {bed.row_index + 1}, Col {bed.col_index + 1}
                          </div>
                        </div>
                      </div>
                      <div>{getStatusBadge(bed.current_status)}</div>
                    </motion.div>
                  ))}
                  {activeTab === "dormitory" && getFilteredBeds().length === 0 && (
                    <div className="py-20 text-center text-muted-foreground">No beds in this category.</div>
                  )}

                  {/* Staff List */}
                  {activeTab === "attendance" && getFilteredStaff().map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 bg-muted/20 hover:bg-muted/40 rounded-xl border border-white/5 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-pink-500/10 flex items-center justify-center font-bold text-pink-600">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold">{s.name}</div>
                          <div className="text-xs text-muted-foreground font-semibold">{s.role} &bull; {s.phone_number}</div>
                        </div>
                      </div>
                      <div>{getStatusBadge(s.status)}</div>
                    </motion.div>
                  ))}
                  {activeTab === "attendance" && getFilteredStaff().length === 0 && (
                    <div className="py-20 text-center text-muted-foreground">No staff members in this category.</div>
                  )}

                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Right Column: Mini Activity & Analytics */}
        <div className="md:col-span-3 flex flex-col gap-6">
          <Card className="bg-linear-to-br from-primary to-blue-600 text-primary-foreground border-none overflow-hidden relative flex-1 flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
              <Building2 size={120} />
            </div>
            <CardHeader className="relative z-10 pb-0">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="size-5" /> Analytics Overview
              </CardTitle>
              <CardDescription className="text-primary-foreground/70">Performance indicators today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 relative z-10 pt-4 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="text-sm font-semibold">Hotel Capacity</div>
                <div className="text-lg font-bold">{occupancyRate}%</div>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="text-sm font-semibold">Dormitory Bed Capacity</div>
                <div className="text-lg font-bold">{bedOccupancyRate}%</div>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="text-sm font-semibold">Staff Attendance Rate</div>
                <div className="text-lg font-bold">{attendanceRate}%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Hall Events Scheduled</div>
                <div className="text-lg font-bold">{hallBookingsCount} Events</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-none flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="size-5 text-emerald-500" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 pt-2">
              <Button size="sm" variant="outline" className="rounded-xl font-bold gap-1 text-xs justify-start h-10 border-white/10 hover:bg-muted/40" asChild>
                <Link href="/rooms"><Bed className="size-3 text-emerald-500" /> Rooms</Link>
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl font-bold gap-1 text-xs justify-start h-10 border-white/10 hover:bg-muted/40" asChild>
                <Link href="/dormitories"><Building2 className="size-3 text-purple-500" /> Dorm Grid</Link>
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl font-bold gap-1 text-xs justify-start h-10 border-white/10 hover:bg-muted/40" asChild>
                <Link href="/attendance"><Users className="size-3 text-pink-500" /> Attendance</Link>
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl font-bold gap-1 text-xs justify-start h-10 border-white/10 hover:bg-muted/40" asChild>
                <Link href="/calendar"><CalendarDays className="size-3 text-indigo-500" /> Calendar</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
