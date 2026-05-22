"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import { toast } from "sonner"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from "date-fns"

import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Activity,
  Building2,
  User,
  Phone,
  Sparkles,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookmarkCheck,
  MapPin,
  Trash2,
  Info
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"

import "../calendar/calendar.css"

export default function DormitoryCalendarPage() {
  const supabase = createClient()

  // State definitions
  const [loading, setLoading] = useState(true)
  const [dormitories, setDormitories] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  
  const [selectedDormId, setSelectedDormId] = useState<string>("")
  const [activeView, setActiveView] = useState<"monthly" | "weekly" | "timeline">("timeline")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Dialog and Modals state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [selectedBed, setSelectedBed] = useState<any>(null)
  const [selectedCellDate, setSelectedCellDate] = useState<Date | null>(null)
  const [groupBookings, setGroupBookings] = useState<any[]>([])

  // Booking Form fields
  const [customerName, setCustomerName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [checkinDate, setCheckinDate] = useState<Date>(new Date())
  const [bookingType, setBookingType] = useState<"booked" | "checked_in">("booked")
  const [submittingBooking, setSubmittingBooking] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  // Load group bookings when selectedBooking changes
  useEffect(() => {
    async function loadGroupBookings() {
      if (selectedBooking?.booking_reference) {
        try {
          const { data } = await supabase
            .from("bed_bookings")
            .select("*, beds(*, dormitories(*))")
            .eq("booking_reference", selectedBooking.booking_reference)
          setGroupBookings(data || [])
        } catch (err) {
          console.error("Error loading group bookings:", err)
        }
      } else {
        setGroupBookings([])
      }
    }
    loadGroupBookings()
  }, [selectedBooking])

  // Refetch data when Selected Dorm changes & listen to realtime updates
  useEffect(() => {
    if (selectedDormId) {
      fetchDormBeds(selectedDormId)
    }

    const channel = supabase
      .channel('dormitory-calendar-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dormitories' }, () => fetchInitialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bed_bookings' }, () => {
        fetchInitialData()
        if (selectedDormId) fetchDormBeds(selectedDormId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => {
        if (selectedDormId) fetchDormBeds(selectedDormId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDormId])

  async function fetchInitialData() {
    try {
      setLoading(true)
      
      // 1. Fetch Dormitories
      const { data: dormsData } = await supabase
        .from("dormitories")
        .select("*")
        .eq("is_active", true)
      
      const loadedDorms = dormsData || []
      setDormitories(loadedDorms)

      if (loadedDorms.length > 0) {
        // Set default selected dorm to the first one
        setSelectedDormId(loadedDorms[0].id)
      }

      // 2. Fetch Bed Bookings
      const { data: bookingsData } = await supabase
        .from("bed_bookings")
        .select("*, beds(*, dormitories(*))")
        .order("created_at", { ascending: false })
      
      setBookings(bookingsData || [])
    } catch (err) {
      console.error("Error fetching initial calendar data:", err)
      toast.error("Failed to load calendar data")
    } finally {
      setLoading(false)
    }
  }

  async function fetchDormBeds(dormId: string) {
    try {
      const { data: bedsData } = await supabase
        .from("beds")
        .select("*, dormitories(*)")
        .eq("dormitory_id", dormId)
        .eq("is_active", true)
      
      // Sort beds naturally by bed number (A1, A2...)
      const sortedBeds = (bedsData || []).sort((a: any, b: any) => 
        a.bed_number.localeCompare(b.bed_number, undefined, { numeric: true, sensitivity: 'base' })
      )
      setBeds(sortedBeds)
    } catch (err) {
      console.error("Error fetching beds:", err)
    }
  }

  // Refresh all state fields
  async function refreshAll() {
    try {
      const { data: bookingsData } = await supabase
        .from("bed_bookings")
        .select("*, beds(*, dormitories(*))")
        .order("created_at", { ascending: false })
      
      setBookings(bookingsData || [])
      
      if (selectedDormId) {
        await fetchDormBeds(selectedDormId)
      }
    } catch (err) {
      console.error("Error refreshing data:", err)
    }
  }

  // Map bookings to FullCalendar events
  const calendarEvents = useMemo(() => {
    if (!bookings || !selectedDormId) return []

    // 1. Booking & Checked In Events
    const activeEvents = bookings
      .filter((b: any) => b.beds?.dormitory_id === selectedDormId && b.status !== "checked_out")
      .map((b: any) => {
        let color = "#3b82f6" // checked_in: Blue
        if (b.status === "booked") color = "#f59e0b" // booked: Amber

        return {
          id: b.id,
          title: `${b.beds?.bed_number}: ${b.customer_name}`,
          start: b.check_in_date,
          end: b.check_out_date || undefined,
          backgroundColor: color,
          borderColor: color,
          extendedProps: { booking: b, type: "booking" }
        }
      })

    // 2. Add temporary events for beds undergoing cleaning
    const cleaningEvents = beds
      .filter((bed: any) => bed.current_status === "cleaning")
      .map((bed: any) => ({
        id: `cleaning-${bed.id}`,
        title: `${bed.bed_number}: Cleaning`,
        start: new Date().toISOString().split("T")[0],
        allDay: true,
        backgroundColor: "#f43f5e", // Rose
        borderColor: "#f43f5e",
        extendedProps: { bed, type: "cleaning" }
      }))

    return [...activeEvents, ...cleaningEvents]
  }, [bookings, beds, selectedDormId])

  // Get status of a bed on a specific date
  const getBedStatusForDate = (bed: any, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    
    // Find booking covering this date
    const booking = (bookings || []).find((b: any) => {
      if (b.bed_id !== bed.id) return false
      
      const start = format(new Date(b.check_in_date), "yyyy-MM-dd")
      const end = b.check_out_date ? format(new Date(b.check_out_date), "yyyy-MM-dd") : null
      
      if (end) {
        return dateStr >= start && dateStr <= end
      } else {
        if (b.status === "checked_in" || b.status === "booked") {
          return dateStr >= start
        }
        return dateStr === start
      }
    })

    if (booking) {
      return { status: booking.status, booking }
    }

    // Fallback to active cleaning status for today
    if (bed.current_status === "cleaning" && isToday(date)) {
      return { status: "cleaning", booking: null }
    }

    return { status: "available", booking: null }
  }

  // Handle FullCalendar Event Clicks
  const handleEventClick = (info: any) => {
    const { extendedProps } = info.event
    if (extendedProps.type === "booking") {
      const booking = extendedProps.booking
      setSelectedBooking(booking)
      setSelectedBed(booking.beds)
      setIsDetailsOpen(true)
    } else if (extendedProps.type === "cleaning") {
      const bed = extendedProps.bed
      setSelectedBed(bed)
      setSelectedBooking(null)
      setIsDetailsOpen(true)
    }
  }

  // Handle Timeline cell clicks
  const handleCellClick = (bed: any, booking: any, status: string, date: Date) => {
    setSelectedBed(bed)
    setSelectedCellDate(date)

    if (status === "available") {
      // Open booking form dialog
      setCustomerName("")
      setPhoneNumber("")
      setCheckinDate(date)
      setBookingType("booked")
      setIsBookingOpen(true)
    } else if (booking) {
      setSelectedBooking(booking)
      setIsDetailsOpen(true)
    } else if (status === "cleaning") {
      setSelectedBooking(null)
      setIsDetailsOpen(true)
    }
  }

  // Business logic transition - Check In Guest
  const handleCheckinGuest = async (booking: any) => {
    try {
      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .update({ status: "checked_in", check_in_date: new Date().toISOString() })
        .eq("id", booking.id)

      if (bookingErr) throw bookingErr

      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: "checked_in" })
        .eq("id", booking.bed_id)

      if (bedErr) throw bedErr

      toast.success(`Checked in ${booking.customer_name} into Bed ${selectedBed?.bed_number}`)
      setIsDetailsOpen(false)
      refreshAll()
    } catch (err: any) {
      toast.error("Check-in error: " + err.message)
    }
  }

  // Business logic transition - Check In Group
  const handleCheckinGroup = async (booking: any) => {
    if (!booking.booking_reference) return
    try {
      // Find all bookings with this reference that are still 'booked'
      const { data: groupBookingsData } = await supabase
        .from("bed_bookings")
        .select("id, bed_id")
        .eq("booking_reference", booking.booking_reference)
        .eq("status", "booked")

      if (!groupBookingsData || groupBookingsData.length === 0) return

      const bookingIds = groupBookingsData.map(gb => gb.id)
      const bedIds = groupBookingsData.map(gb => gb.bed_id)

      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .update({ status: "checked_in", check_in_date: new Date().toISOString() })
        .in("id", bookingIds)

      if (bookingErr) throw bookingErr

      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: "checked_in" })
        .in("id", bedIds)

      if (bedErr) throw bedErr

      toast.success(`Group check-in completed for ${booking.customer_name} (${bookingIds.length} beds)`)
      setIsDetailsOpen(false)
      refreshAll()
    } catch (err: any) {
      toast.error("Group check-in failed: " + err.message)
    }
  }

  // Business logic transition - Process Check Out
  const handleCheckoutGuest = async (booking: any) => {
    try {
      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .update({
          status: "checked_out",
          check_out_date: new Date().toISOString()
        })
        .eq("id", booking.id)

      if (bookingErr) throw bookingErr

      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: "cleaning" })
        .eq("id", booking.bed_id)

      if (bedErr) throw bedErr

      toast.success(`Checked out ${booking.customer_name} from Bed ${selectedBed?.bed_number}. Bed is now undergoing cleaning.`)
      setIsDetailsOpen(false)
      refreshAll()
    } catch (err: any) {
      toast.error("Check-out error: " + err.message)
    }
  }

  // Business logic transition - Check Out Group
  const handleCheckoutGroup = async (booking: any) => {
    if (!booking.booking_reference) return
    try {
      // Find all bookings with this reference that are checked_in
      const { data: groupBookingsData } = await supabase
        .from("bed_bookings")
        .select("id, bed_id")
        .eq("booking_reference", booking.booking_reference)
        .eq("status", "checked_in")

      if (!groupBookingsData || groupBookingsData.length === 0) return

      const bookingIds = groupBookingsData.map(gb => gb.id)
      const bedIds = groupBookingsData.map(gb => gb.bed_id)

      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .update({
          status: "checked_out",
          check_out_date: new Date().toISOString()
        })
        .in("id", bookingIds)

      if (bookingErr) throw bookingErr

      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: "cleaning" })
        .in("id", bedIds)

      if (bedErr) throw bedErr

      toast.success(`Group checkout completed. ${bedIds.length} beds sent to cleaning.`)
      setIsDetailsOpen(false)
      refreshAll()
    } catch (err: any) {
      toast.error("Group checkout failed: " + err.message)
    }
  }

  // Business logic transition - Complete Cleaning
  const handleCompleteCleaning = async (bedId: string) => {
    try {
      const { error } = await supabase
        .from("beds")
        .update({ current_status: "available" })
        .eq("id", bedId)

      if (error) throw error

      toast.success(`Bed ${selectedBed?.bed_number} marked clean and is now AVAILABLE.`)
      setIsDetailsOpen(false)
      refreshAll()
    } catch (err: any) {
      toast.error("Error setting bed available: " + err.message)
    }
  }

  // Cancel booking
  const handleCancelBooking = async (booking: any) => {
    try {
      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .delete()
        .eq("id", booking.id)

      if (bookingErr) throw bookingErr

      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: "available" })
        .eq("id", booking.bed_id)

      if (bedErr) throw bedErr

      toast.success("Booking cancelled successfully")
      setIsDetailsOpen(false)
      refreshAll()
    } catch (err: any) {
      toast.error("Failed to cancel booking: " + err.message)
    }
  }

  // Business logic transition - Cancel Group Booking
  const handleCancelGroupBooking = async (booking: any) => {
    if (!booking.booking_reference) return
    try {
      const { data: groupBookingsData } = await supabase
        .from("bed_bookings")
        .select("id, bed_id")
        .eq("booking_reference", booking.booking_reference)

      if (!groupBookingsData || groupBookingsData.length === 0) return

      const bookingIds = groupBookingsData.map(gb => gb.id)
      const bedIds = groupBookingsData.map(gb => gb.bed_id)

      // Delete all bookings in group
      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .delete()
        .in("id", bookingIds)

      if (bookingErr) throw bookingErr

      // Set all beds to available
      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: "available" })
        .in("id", bedIds)

      if (bedErr) throw bedErr

      toast.success("Group booking cancelled successfully")
      setIsDetailsOpen(false)
      refreshAll()
    } catch (err: any) {
      toast.error("Failed to cancel group booking: " + err.message)
    }
  }

  // Submit new booking
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim() || !selectedBed) return
    setSubmittingBooking(true)
    try {
      // 1. Insert booking
      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .insert([{
          customer_name: customerName,
          phone_number: phoneNumber || null,
          bed_id: selectedBed.id,
          check_in_date: checkinDate.toISOString(),
          status: bookingType,
          booking_reference: crypto.randomUUID()
        }])

      if (bookingErr) throw bookingErr

      // 2. Update bed status
      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: bookingType })
        .eq("id", selectedBed.id)

      if (bedErr) throw bedErr

      toast.success(`Booking created for ${customerName} at Bed ${selectedBed.bed_number}`)
      setIsBookingOpen(false)
      refreshAll()
    } catch (err: any) {
      toast.error("Booking error: " + err.message)
    } finally {
      setSubmittingBooking(false)
    }
  }

  // Calendar Timeline Helpers
  const daysInMonthList = useMemo(() => {
    const start = startOfMonth(selectedDate)
    const end = endOfMonth(selectedDate)
    return eachDayOfInterval({ start, end })
  }, [selectedDate])

  const getStatusColorConfig = (status: string) => {
    switch (status) {
      case "available":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
          border: "border-emerald-500/20",
          badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          label: "Available"
        }
      case "booked":
        return {
          bg: "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30",
          border: "border-amber-500/30",
          badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          label: "Booked (Reserved)"
        }
      case "checked_in":
        return {
          bg: "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30",
          border: "border-blue-500/30",
          badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          label: "Checked-In"
        }
      case "checked_out":
        return {
          bg: "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",
          border: "border-purple-500/30",
          badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",
          label: "Checked-Out"
        }
      case "cleaning":
        return {
          bg: "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30",
          border: "border-rose-500/30",
          badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
          label: "Cleaning"
        }
      default:
        return {
          bg: "bg-slate-500/10 text-slate-400",
          border: "border-slate-500/20",
          badge: "bg-slate-500/10 text-slate-400",
          label: "N/A"
        }
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dormitory Calendar</h2>
          <p className="text-muted-foreground text-sm">
            Visualize bed occupancy and manage the booking lifecycle.
          </p>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex flex-wrap items-center gap-3">
          {/* DORMITORY SELECTOR */}
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-violet-500" />
            <Select value={selectedDormId} onValueChange={setSelectedDormId}>
              <SelectTrigger className="w-[200px] rounded-xl glass-card border-white/10 text-sm font-semibold">
                <SelectValue placeholder="Select Dormitory" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                {dormitories.map((dorm) => (
                  <SelectItem key={dorm.id} value={dorm.id} className="font-medium">
                    {dorm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* VIEW SWITCHER */}
          <div className="flex rounded-xl bg-muted/20 border border-white/5 p-1 text-sm font-medium">
            <button
              onClick={() => setActiveView("timeline")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                activeView === "timeline" ? "bg-violet-600 text-white font-bold" : "text-muted-foreground hover:text-white"
              )}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveView("monthly")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                activeView === "monthly" ? "bg-violet-600 text-white font-bold" : "text-muted-foreground hover:text-white"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setActiveView("weekly")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                activeView === "weekly" ? "bg-violet-600 text-white font-bold" : "text-muted-foreground hover:text-white"
              )}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {/* DATE NAVIGATION FOR TIMELINE VIEW */}
      {activeView === "timeline" && (
        <div className="flex items-center gap-2 bg-muted/20 p-2 rounded-xl border border-white/5 w-fit">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg h-9 w-9 text-muted-foreground hover:text-white"
            onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg h-9 font-bold bg-muted/30 border-white/10 hover:bg-muted/50"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg h-9 w-9 text-muted-foreground hover:text-white"
            onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <span className="font-bold text-sm px-3 text-white">
            {format(selectedDate, "MMMM yyyy")}
          </span>
        </div>
      )}

      {/* MAIN CONTENT DISPLAY CARD */}
      <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-md relative overflow-hidden">
        <CardContent className="p-4 md:p-6">
          {loading ? (
            <div className="h-[450px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw className="size-8 animate-spin text-violet-500" />
              <p className="font-bold text-sm">Loading occupancy data...</p>
            </div>
          ) : activeView === "timeline" ? (
            /* TIMELINE VIEW */
            <div className="space-y-4">
              <div className="overflow-x-auto border border-white/10 rounded-xl bg-background/25">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-muted/30">
                      <th className="sticky left-0 z-20 bg-[#121214] p-3 text-left font-bold text-xs text-muted-foreground border-r border-white/10 min-w-[140px]">
                        Bed Space
                      </th>
                      {daysInMonthList.map((day) => {
                        const isTdy = isToday(day)
                        return (
                          <th
                            key={day.toString()}
                            className={cn(
                              "p-2 text-center text-xs font-bold min-w-[45px] border-r border-white/5",
                              isTdy && "bg-violet-500/10 text-violet-400"
                            )}
                          >
                            <div className="text-[10px] uppercase text-muted-foreground/60">{format(day, "eee")}</div>
                            <div className={cn("text-xs font-black mt-0.5", isTdy && "text-violet-400")}>
                              {format(day, "d")}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {beds.length === 0 ? (
                      <tr>
                        <td colSpan={daysInMonthList.length + 1} className="p-8 text-center text-muted-foreground text-sm">
                          No beds configured in this dormitory.
                        </td>
                      </tr>
                    ) : (
                      beds.map((bed) => (
                        <tr key={bed.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors h-14">
                          <td className="sticky left-0 z-10 bg-[#121214] p-3 text-xs font-bold border-r border-white/10 flex items-center justify-between min-w-[140px] h-14">
                            <span className="text-white">{bed.bed_number}</span>
                            {/* Short indicators of the current status */}
                            <div className={cn(
                              "size-2.5 rounded-full border",
                              bed.current_status === "available" && "bg-emerald-500 border-emerald-400/30",
                              bed.current_status === "booked" && "bg-amber-500 border-amber-400/30",
                              bed.current_status === "checked_in" && "bg-blue-500 border-blue-400/30",
                              bed.current_status === "cleaning" && "bg-rose-500 border-rose-400/30"
                            )} />
                          </td>
                          {daysInMonthList.map((day) => {
                            const { status, booking } = getBedStatusForDate(bed, day)
                            const config = getStatusColorConfig(status)
                            
                            return (
                              <td
                                key={day.toString()}
                                className={cn(
                                  "p-1 border-r border-white/5 min-w-[45px] cursor-pointer hover:bg-white/[0.05] transition-all",
                                  isToday(day) && "bg-white/[0.02]"
                                )}
                                onClick={() => handleCellClick(bed, booking, status, day)}
                              >
                                {status !== "available" && (
                                  <div
                                    className={cn(
                                      "w-full h-10 rounded-lg flex flex-col items-center justify-center text-[9px] font-black border shadow-sm transition-all hover:scale-105",
                                      config.bg,
                                      config.border
                                    )}
                                    title={`${bed.bed_number} - ${config.label} ${booking ? `: ${booking.customer_name}` : ""}`}
                                  >
                                    <span>
                                      {status === "booked" && "RES"}
                                      {status === "checked_in" && "OCC"}
                                      {status === "checked_out" && "OUT"}
                                      {status === "cleaning" && "CLN"}
                                    </span>
                                    {booking && (
                                      <span className="text-[7px] max-w-[40px] truncate opacity-80">
                                        {booking.customer_name.split(" ")[0]}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* FULL CALENDAR VIEW */
            <div className="calendar-container">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView={activeView === "monthly" ? "dayGridMonth" : "timeGridWeek"}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,listMonth"
                }}
                events={calendarEvents}
                height="auto"
                eventClick={handleEventClick}
                dayMaxEvents={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* LEGEND CARD */}
      <Card className="border-none bg-card/20 backdrop-blur-sm p-4">
        <div className="flex flex-wrap gap-6 justify-center text-sm font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[8px] font-black text-emerald-400">AV</div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-md bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-[8px] font-black text-amber-300">RES</div>
            <span>Reserved (Booked)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-md bg-blue-500/25 border border-blue-500/30 flex items-center justify-center text-[8px] font-black text-blue-300">OCC</div>
            <span>Occupied (Checked In)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-md bg-purple-500/25 border border-purple-500/30 flex items-center justify-center text-[8px] font-black text-purple-300">OUT</div>
            <span>Checked Out</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-md bg-rose-500/25 border border-rose-500/30 flex items-center justify-center text-[8px] font-black text-rose-300">CLN</div>
            <span>Cleaning / Maintenance</span>
          </div>
        </div>
      </Card>

      {/* BED BOOKING DIALOG (FOR AVAILABLE CELLS) */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="sm:max-w-[450px] glass-card border-none text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-violet-400">
              <Sparkles className="size-5" />
              Book Bed Space: {selectedBed?.bed_number}
            </DialogTitle>
            <CardDescription className="text-slate-400">
              Reserve or instantly check-in for the selected bed.
            </CardDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBooking} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="font-bold flex items-center gap-1.5 text-slate-300">
                <User className="size-3.5" /> Customer Name *
              </Label>
              <Input
                placeholder="e.g. John Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-xl bg-muted/20 border-white/10 text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold flex items-center gap-1.5 text-slate-300">
                <Phone className="size-3.5" /> Phone Number (Optional)
              </Label>
              <Input
                placeholder="e.g. +91 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="rounded-xl bg-muted/20 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 flex flex-col">
                <Label className="font-bold flex items-center gap-1.5 mb-1 text-slate-300">
                  <CalendarIcon className="size-3.5" /> Check-in Date *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="rounded-xl pl-3 text-left font-normal h-10 bg-muted/25 border-white/10 hover:bg-muted/40 text-white">
                      {format(checkinDate, "PPP")}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50 text-slate-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-none bg-zinc-900" align="start">
                    <Calendar
                      mode="single"
                      selected={checkinDate}
                      onSelect={(d) => d && setCheckinDate(d)}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="bg-zinc-900 border-none text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold flex items-center gap-1.5 mb-1 text-slate-300">
                  <BookmarkCheck className="size-3.5" /> Booking Status *
                </Label>
                <Select value={bookingType} onValueChange={(val: any) => setBookingType(val)}>
                  <SelectTrigger className="rounded-xl bg-muted/20 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card text-white">
                    <SelectItem value="booked">Booked (Reserved)</SelectItem>
                    <SelectItem value="checked_in">Checked In (Active)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsBookingOpen(false)}
                className="rounded-xl font-bold border border-white/5 hover:bg-white/5 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white flex-1"
                disabled={submittingBooking}
              >
                {submittingBooking && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Bed Reservation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BOOKING DETAILS & ACTION DIALOG */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[450px] glass-card border-none text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-violet-400">
              <Info className="size-5" />
              Bed Details: {selectedBed?.bed_number}
            </DialogTitle>
            <CardDescription className="text-slate-400">
              Dormitory: {selectedBed?.dormitories?.name || dormitories.find(d => d.id === selectedBed?.dormitory_id)?.name || "N/A"}
            </CardDescription>
          </DialogHeader>

          {/* ACTIVE BOOKING DISPLAY */}
          {selectedBooking ? (
            <div className="space-y-4 pt-3 text-sm">
              <div className="p-4 bg-muted/30 border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-semibold text-slate-400">Guest Name</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <User className="size-3.5 text-violet-400" />
                    {selectedBooking.customer_name}
                  </span>
                </div>
                
                {selectedBooking.phone_number && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-semibold text-slate-400">Phone Number</span>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Phone className="size-3.5 text-violet-400" />
                      {selectedBooking.phone_number}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-semibold text-slate-400">Check-in Date</span>
                  <span className="font-bold text-white">
                    {format(new Date(selectedBooking.check_in_date), "MMM d, yyyy")}
                  </span>
                </div>

                {selectedBooking.check_out_date && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-semibold text-slate-400">Expected Check-out</span>
                    <span className="font-bold text-white">
                      {format(new Date(selectedBooking.check_out_date), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Booking Status</span>
                  {selectedBooking.status === "booked" && (
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                      Booked / Reserved
                    </Badge>
                  )}
                  {selectedBooking.status === "checked_in" && (
                    <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                      Checked In / Active
                    </Badge>
                  )}
                  {selectedBooking.status === "checked_out" && (
                    <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                      Checked Out
                    </Badge>
                  )}
                </div>
              </div>

              {/* GROUP BOOKING INFO */}
              {groupBookings.length > 1 && (
                <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1">
                    <span className="font-bold text-violet-400 text-xs uppercase tracking-wider">Group Booking</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Ref: {selectedBooking.booking_reference.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    This bed is booked as part of a group reservation containing <span className="font-bold text-white">{groupBookings.length} beds</span>:
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {groupBookings.map((gb: any) => (
                      <Badge
                        key={gb.id}
                        className={cn(
                          "text-[10px] font-semibold border transition-colors",
                          gb.id === selectedBooking.id
                            ? "bg-violet-600 text-white border-violet-500 font-bold"
                            : "bg-muted/40 text-slate-300 border-white/5"
                        )}
                      >
                        Bed {gb.beds?.bed_number} ({gb.status === "booked" ? "Booked" : gb.status === "checked_in" ? "Checked In" : gb.status})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS BASED ON ACTIVE BOOKING STATUS */}
              <div className="flex flex-col gap-2 pt-2">
                {selectedBooking.status === "booked" && (
                  <Button
                    className="w-full rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white h-11"
                    onClick={() => handleCheckinGuest(selectedBooking)}
                  >
                    <LogIn className="size-4 mr-2" /> Check-In Bed Now
                  </Button>
                )}

                {groupBookings.length > 1 && groupBookings.some((gb: any) => gb.status === "booked") && (
                  <Button
                    className="w-full rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white h-11"
                    onClick={() => handleCheckinGroup(selectedBooking)}
                  >
                    <LogIn className="size-4 mr-2" /> Check-In Entire Group ({groupBookings.filter((gb: any) => gb.status === "booked").length} Beds)
                  </Button>
                )}

                {selectedBooking.status === "checked_in" && (
                  <Button
                    className="w-full rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white h-11"
                    onClick={() => handleCheckoutGuest(selectedBooking)}
                  >
                    <LogOut className="size-4 mr-2" /> Process Check-Out
                  </Button>
                )}

                {groupBookings.length > 1 && groupBookings.some((gb: any) => gb.status === "checked_in") && (
                  <Button
                    className="w-full rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white h-11"
                    onClick={() => handleCheckoutGroup(selectedBooking)}
                  >
                    <LogOut className="size-4 mr-2" /> Check-Out Entire Group ({groupBookings.filter((gb: any) => gb.status === "checked_in").length} Beds)
                  </Button>
                )}

                {/* Cancel Booking option for booked reservations */}
                {selectedBooking.status === "booked" && (
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl font-bold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 h-10 border border-rose-500/20"
                    onClick={() => handleCancelBooking(selectedBooking)}
                  >
                    <Trash2 className="size-4 mr-2" /> Cancel Bed Reservation
                  </Button>
                )}

                {groupBookings.length > 1 && groupBookings.some((gb: any) => gb.status === "booked") && (
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl font-bold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 h-10 border border-rose-500/20"
                    onClick={() => handleCancelGroupBooking(selectedBooking)}
                  >
                    <Trash2 className="size-4 mr-2" /> Cancel Entire Group Booking
                  </Button>
                )}
              </div>
            </div>
          ) : selectedBed?.current_status === "cleaning" ? (
            /* CLEANING BED VIEW */
            <div className="space-y-4 pt-3 text-sm">
              <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl text-center space-y-2">
                <Sparkles className="size-8 text-rose-400 mx-auto animate-pulse" />
                <p className="font-bold text-base text-rose-400">Bed is Undergoing Cleaning</p>
                <p className="text-muted-foreground text-xs">
                  This space is currently checked-out and is being prepared for the next guest.
                </p>
              </div>

              <Button
                className="w-full rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                onClick={() => handleCompleteCleaning(selectedBed.id)}
              >
                <CheckCircle2 className="size-4 mr-2" /> Mark Cleaning Complete
              </Button>
            </div>
          ) : (
            /* AVAILABLE BED DISPLAY */
            <div className="space-y-4 pt-3 text-sm">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-center space-y-2">
                <CheckCircle2 className="size-8 text-emerald-400 mx-auto" />
                <p className="font-bold text-base text-emerald-400 font-bold">Bed Space is Available</p>
                <p className="text-muted-foreground text-xs">
                  No active reservation or guest is currently assigned to this bed.
                </p>
              </div>

              <Button
                className="w-full rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white h-11"
                onClick={() => {
                  setIsDetailsOpen(false)
                  setCustomerName("")
                  setPhoneNumber("")
                  setCheckinDate(selectedCellDate || new Date())
                  setBookingType("booked")
                  setIsBookingOpen(true)
                }}
              >
                <LogIn className="size-4 mr-2" /> Book / Check-In Bed
              </Button>
            </div>
          )}

          <DialogFooter className="border-t border-white/5 pt-3">
            <Button
              variant="outline"
              onClick={() => setIsDetailsOpen(false)}
              className="w-full rounded-xl font-semibold bg-muted/20 border-white/10 hover:bg-muted/40 text-slate-300"
            >
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
