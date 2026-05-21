"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Users,
  CalendarDays,
  FileText,
  UserCheck,
  UserX,
  History,
  TrendingUp,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Trash2,
  Edit2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, subDays } from "date-fns"
import { generateAttendanceReport } from "@/lib/reports"

export default function AttendancePage() {
  const supabase = createClient()
  
  // Navigation State
  const [activeSubTab, setActiveSubTab] = useState<"daily" | "calendar" | "staff" | "reports">("daily")
  
  // Data States
  const [staff, setStaff] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Daily Sheet State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dailySheet, setDailySheet] = useState<Record<string, "present" | "absent">>({})
  const [savingDaily, setSavingDaily] = useState(false)

  // Staff History State
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [staffHistory, setStaffHistory] = useState<any[]>([])

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  // Reports State
  const [reportRange, setReportRange] = useState<"weekly" | "monthly" | "yearly" | "custom">("monthly")
  const [customStart, setCustomStart] = useState<Date>(subDays(new Date(), 30))
  const [customEnd, setCustomEnd] = useState<Date>(new Date())
  const [reportData, setReportData] = useState<any[]>([])

  // Create Staff Modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false)
  const [newStaffName, setNewStaffName] = useState("")
  const [newStaffRole, setNewStaffRole] = useState("")
  const [newStaffPhone, setNewStaffPhone] = useState("")
  const [addingStaff, setAddingStaff] = useState(false)
  
  // Edit Staff Profile Modal
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false)
  const [editStaffName, setEditStaffName] = useState("")
  const [editStaffRole, setEditStaffRole] = useState("")
  const [editStaffPhone, setEditStaffPhone] = useState("")
  const [updatingStaff, setUpdatingStaff] = useState(false)

  // Delete Staff Modal
  const [isDeleteStaffOpen, setIsDeleteStaffOpen] = useState(false)
  const [deletingStaff, setDeletingStaff] = useState(false)

  // Delete Attendance Log Modal
  const [isDeleteAttendanceOpen, setIsDeleteAttendanceOpen] = useState(false)
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<any>(null)
  const [deletingAttendance, setDeletingAttendance] = useState(false)

  useEffect(() => {
    fetchStaffAndAllAttendance()

    const channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => fetchStaffAndAllAttendance())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchStaffAndAllAttendance())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    // Populate daily sheet whenever date or attendance data changes
    if (staff.length > 0) {
      const dateStr = selectedDate.toISOString().split("T")[0]
      const sheet: Record<string, "present" | "absent"> = {}
      
      staff.forEach(s => {
        const record = attendance.find(a => a.staff_id === s.id && a.date === dateStr)
        sheet[s.id] = record ? record.status : "present" // Default to present for convenience
      });
      
      setDailySheet(sheet)
    }
  }, [selectedDate, staff, attendance])

  useEffect(() => {
    if (selectedStaffId) {
      const records = attendance
        .filter(a => a.staff_id === selectedStaffId)
        .sort((a, b) => b.date.localeCompare(a.date))
      setStaffHistory(records)
    }
  }, [selectedStaffId, attendance])

  useEffect(() => {
    generateReports()
  }, [reportRange, customStart, customEnd, attendance, staff])

  async function fetchStaffAndAllAttendance() {
    setLoading(true)
    try {
      // 1. Fetch staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true })
      
      setStaff(staffData || [])
      if (staffData && staffData.length > 0) {
        setSelectedStaffId(staffData[0].id)
      }

      // 2. Fetch all attendance records
      const { data: attData } = await supabase
        .from("attendance")
        .select("*, staff(name, role)")
        .order("date", { ascending: false })
      
      setAttendance(attData || [])
    } catch (err) {
      console.error(err)
      toast.error("Failed to load staff list")
    } finally {
      setLoading(false)
    }
  }

  // Add new staff member
  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!newStaffName.trim()) return
    setAddingStaff(true)
    try {
      const { data, error } = await supabase
        .from("staff")
        .insert([{
          name: newStaffName,
          role: newStaffRole,
          phone_number: newStaffPhone,
          is_active: true
        }])
        .select()

      if (error) throw error
      toast.success(`Staff member "${newStaffName}" added successfully`)
      setIsAddStaffOpen(false)
      setNewStaffName("")
      setNewStaffRole("")
      setNewStaffPhone("")
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Error adding staff: " + err.message)
    } finally {
      setAddingStaff(false)
    }
  }

  // Toggle present / absent on daily sheet
  const handleToggleDaily = (staffId: string, status: "present" | "absent") => {
    setDailySheet(prev => ({
      ...prev,
      [staffId]: status
    }))
  }

  // Save Today's or Selected Date's attendance sheet
  async function handleSaveAttendance() {
    setSavingDaily(true)
    const dateStr = selectedDate.toISOString().split("T")[0]
    try {
      // Delete any existing records for this date
      const { error: deleteErr } = await supabase
        .from("attendance")
        .delete()
        .eq("date", dateStr)

      if (deleteErr) throw deleteErr

      // Insert new records
      const inserts = Object.entries(dailySheet).map(([staffId, status]) => ({
        staff_id: staffId,
        date: dateStr,
        status
      }))

      const { error: insertErr } = await supabase
        .from("attendance")
        .insert(inserts)

      if (insertErr) throw insertErr

      toast.success(`Attendance saved successfully for ${format(selectedDate, "MMM d, yyyy")}`)
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Failed to save attendance: " + err.message)
    } finally {
      setSavingDaily(false)
    }
  }

  // Generate Reports & Calculate Statistics
  function generateReports() {
    if (staff.length === 0) return

    let start: Date
    let end: Date = new Date()

    if (reportRange === "weekly") {
      start = startOfWeek(new Date())
      end = endOfWeek(new Date())
    } else if (reportRange === "monthly") {
      start = startOfMonth(new Date())
      end = endOfMonth(new Date())
    } else if (reportRange === "yearly") {
      start = new Date(new Date().getFullYear(), 0, 1)
      end = new Date(new Date().getFullYear(), 11, 31)
    } else {
      start = customStart
      end = customEnd
    }

    const startStr = start.toISOString().split("T")[0]
    const endStr = end.toISOString().split("T")[0]

    const rangeAttendance = attendance.filter(a => a.date >= startStr && a.date <= endStr)

    const list = staff.map(s => {
      const records = rangeAttendance.filter(a => a.staff_id === s.id)
      const total = records.length
      const present = records.filter(a => a.status === "present").length
      const absent = records.filter(a => a.status === "absent").length
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0

      return {
        id: s.id,
        name: s.name,
        role: s.role,
        totalDays: total,
        presentDays: present,
        absentDays: absent,
        percentage
      }
    })

    setReportData(list)
  }

  // Attendance rate calculations for focused staff
  const getStaffAnalytics = () => {
    if (staffHistory.length === 0) return { present: 0, absent: 0, rate: 0 }
    const present = staffHistory.filter(h => h.status === "present").length
    const absent = staffHistory.filter(h => h.status === "absent").length
    const rate = Math.round((present / staffHistory.length) * 100)
    return { present, absent, rate }
  }

  const staffAnalytics = getStaffAnalytics()

  // Generate days in month for Attendance Calendar
  const getMonthDays = () => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }

  const calendarDays = getMonthDays()

  // Move calendar month
  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Edit Staff Profile
  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!editStaffName.trim() || !selectedStaffId) return
    setUpdatingStaff(true)
    try {
      const { error } = await supabase
        .from("staff")
        .update({
          name: editStaffName,
          role: editStaffRole,
          phone_number: editStaffPhone,
        })
        .eq("id", selectedStaffId)

      if (error) throw error
      toast.success("Staff profile updated successfully")
      setIsEditStaffOpen(false)
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Failed to update staff profile: " + err.message)
    } finally {
      setUpdatingStaff(false)
    }
  }

  // Delete Staff Profile
  async function handleDeleteStaff() {
    if (!selectedStaffId) return
    setDeletingStaff(true)
    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", selectedStaffId)

      if (error) throw error
      toast.success("Staff member deleted successfully")
      setIsDeleteStaffOpen(false)
      setSelectedStaffId("")
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Failed to delete staff member: " + err.message)
    } finally {
      setDeletingStaff(false)
    }
  }

  // Update attendance log status
  async function handleUpdateAttendanceStatus(recordId: string, newStatus: "present" | "absent") {
    try {
      const { error } = await supabase
        .from("attendance")
        .update({ status: newStatus })
        .eq("id", recordId)

      if (error) throw error
      toast.success("Attendance record updated")
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Failed to update attendance status: " + err.message)
    }
  }

  // Delete attendance log
  async function handleDeleteAttendance() {
    if (!selectedAttendanceRecord) return
    setDeletingAttendance(true)
    try {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("id", selectedAttendanceRecord.id)

      if (error) throw error
      toast.success("Attendance record deleted successfully")
      setIsDeleteAttendanceOpen(false)
      setSelectedAttendanceRecord(null)
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Failed to delete attendance record: " + err.message)
    } finally {
      setDeletingAttendance(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight">Staff Attendance</h2>
          <p className="text-muted-foreground font-medium">
            Manage daily rosters, review monthly logs, and run detailed staff analytics.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="rounded-xl font-bold shadow-lg shadow-primary/25 h-11 px-6"
            onClick={() => setIsAddStaffOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" /> Add Staff Member
          </Button>
        </div>
      </div>

      {/* Roster & Dashboard Navigation Sub-Tabs */}
      <div className="flex border-b border-white/10 dark:border-white/5 pb-1 gap-6">
        {[
          { key: "daily", label: "Daily Sheet", icon: ClipboardList },
          { key: "calendar", label: "Monthly Calendar", icon: CalendarDays },
          { key: "staff", label: "Staff History", icon: History },
          { key: "reports", label: "Roster Reports", icon: FileText },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveSubTab(t.key as any)}
            className={cn(
              "text-base font-bold pb-2 relative flex items-center gap-2 transition-all duration-300",
              activeSubTab === t.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
            {activeSubTab === t.key && (
              <motion.div layoutId="att-subtab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* SUB-TABS VIEWS */}
      <AnimatePresence mode="wait">
        
        {/* Tab 1: Daily Attendance Mark Sheet */}
        {activeSubTab === "daily" && (
          <motion.div
            key="daily-sheet"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <ClipboardList className="size-5 text-pink-500" />
                <span className="font-bold text-sm">Target Date Assignment:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="rounded-xl h-10 px-4 font-bold border-white/10 bg-background/50">
                      {format(selectedDate, "PPPP")}
                      <CalendarDays className="ml-2 h-4 w-4 text-primary" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => d && setSelectedDate(d)}
                      disabled={d => d > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button className="rounded-xl font-bold bg-pink-600 hover:bg-pink-700 h-10 px-6" onClick={handleSaveAttendance} disabled={savingDaily}>
                {savingDaily && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Submit Daily Attendance
              </Button>
            </div>

            <Card className="glass-card border-none overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-white/10">
                      <TableHead className="font-bold py-4 pl-6">Staff Member</TableHead>
                      <TableHead className="font-bold py-4">Role</TableHead>
                      <TableHead className="font-bold py-4">Contact Details</TableHead>
                      <TableHead className="font-bold py-4 text-center">Roster Record</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground font-semibold">
                          Loading staff profiles...
                        </TableCell>
                      </TableRow>
                    ) : staff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground font-semibold">
                          No staff profiles registered. Add staff members above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      staff.map(s => {
                        const status = dailySheet[s.id] || "present"
                        return (
                          <TableRow key={s.id} className="border-white/10 hover:bg-muted/10">
                            <TableCell className="py-4 pl-6 font-bold flex items-center gap-3">
                              <div className="size-8 rounded-lg bg-pink-500/10 text-pink-600 font-bold flex items-center justify-center text-xs">
                                {s.name.charAt(0)}
                              </div>
                              {s.name}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">{s.role}</TableCell>
                            <TableCell className="font-medium text-xs text-muted-foreground">{s.phone_number || "N/A"}</TableCell>
                            <TableCell className="text-center py-4">
                              <div className="flex justify-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={status === "present" ? "default" : "outline"}
                                  className={cn(
                                    "rounded-lg font-bold text-xs h-9 px-4 gap-1.5",
                                    status === "present" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                                  )}
                                  onClick={() => handleToggleDaily(s.id, "present")}
                                >
                                  <Check className="size-3.5" /> Present
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={status === "absent" ? "default" : "outline"}
                                  className={cn(
                                    "rounded-lg font-bold text-xs h-9 px-4 gap-1.5",
                                    status === "absent" ? "bg-rose-600 hover:bg-rose-700 text-white" : "border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                                  )}
                                  onClick={() => handleToggleDaily(s.id, "absent")}
                                >
                                  <X className="size-3.5" /> Absent
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tab 2: Monthly Calendar view */}
        {activeSubTab === "calendar" && (
          <motion.div
            key="calendar-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Calendar Controls */}
            <div className="flex items-center justify-between bg-muted/20 border border-white/5 p-4 rounded-2xl">
              <h3 className="text-xl font-bold">{format(currentMonth, "MMMM yyyy")}</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-xl" onClick={prevMonth}>
                  <ChevronLeft className="size-5" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-xl" onClick={nextMonth}>
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <Card className="glass-card border-none overflow-hidden p-6">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground pb-4 border-b border-white/5">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              
              <div className="grid grid-cols-7 gap-3 mt-4">
                {/* Empty cells for leading days */}
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-20 opacity-0" />
                ))}

                {/* Calendar Days */}
                {calendarDays.map((day) => {
                  const dateStr = day.toISOString().split("T")[0]
                  const dayRecords = attendance.filter(a => a.date === dateStr)
                  const present = dayRecords.filter(a => a.status === "present").length
                  const absent = dayRecords.filter(a => a.status === "absent").length
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        setSelectedDate(day)
                        setActiveSubTab("daily")
                      }}
                      className={cn(
                        "h-24 p-2 bg-muted/10 hover:bg-primary/[0.04] border border-white/5 rounded-xl cursor-pointer transition-all flex flex-col justify-between items-start group relative overflow-hidden",
                        isToday ? "ring-2 ring-primary bg-primary/[0.02]" : ""
                      )}
                    >
                      <span className={cn("text-sm font-black", isToday ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                        {day.getDate()}
                      </span>
                      {dayRecords.length > 0 ? (
                        <div className="space-y-1 w-full text-[10px] font-bold">
                          <div className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex justify-between">
                            <span>Present:</span>
                            <span>{present}</span>
                          </div>
                          <div className="text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md flex justify-between">
                            <span>Absent:</span>
                            <span>{absent}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] italic text-muted-foreground/60">Not Marked</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tab 3: Staff History & Analytics */}
        {activeSubTab === "staff" && (
          <motion.div
            key="staff-history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left Staff List Selector */}
            <Card className="glass-card border-none overflow-hidden h-fit">
              <CardHeader className="py-4 border-b border-white/5">
                <CardTitle className="text-lg font-bold">Staff Profiles</CardTitle>
                <CardDescription>Select staff member to check stats</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {staff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaffId(s.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all",
                      selectedStaffId === s.id
                        ? "bg-primary/10 border-primary text-primary font-bold"
                        : "bg-muted/10 border-white/5 hover:bg-muted/20"
                    )}
                  >
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{s.name}</div>
                      <div className="text-xs text-muted-foreground/80 font-semibold">{s.role}</div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Right Detailed History */}
            <div className="lg:col-span-2 space-y-6">
              {selectedStaffId ? (
                <>
                  {(() => {
                    const currentStaff = staff.find(s => s.id === selectedStaffId)
                    if (!currentStaff) return null
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 border border-white/5 p-4 rounded-2xl text-foreground">
                        <div>
                          <h4 className="text-xl font-bold">{currentStaff.name}</h4>
                          <p className="text-xs text-muted-foreground font-semibold">
                            Role: {currentStaff.role} {currentStaff.phone_number ? `• Phone: ${currentStaff.phone_number}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="rounded-xl font-bold border-white/10 bg-muted/10 hover:bg-white/5 text-foreground h-9 px-4"
                            onClick={() => {
                              setEditStaffName(currentStaff.name)
                              setEditStaffRole(currentStaff.role || "")
                              setEditStaffPhone(currentStaff.phone_number || "")
                              setIsEditStaffOpen(true)
                            }}
                          >
                            Edit Profile
                          </Button>
                          <Button
                            variant="destructive"
                            className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 h-9 px-4 text-white"
                            onClick={() => setIsDeleteStaffOpen(true)}
                          >
                            Delete Profile
                          </Button>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Performance stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="glass-card border-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Attendance Rate</span>
                        <span className="text-3xl font-black text-primary mt-1">{staffAnalytics.rate}%</span>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Days Present</span>
                        <span className="text-3xl font-black text-emerald-500 mt-1">{staffAnalytics.present} Days</span>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Days Absent</span>
                        <span className="text-3xl font-black text-rose-500 mt-1">{staffAnalytics.absent} Days</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Attendance Log Table */}
                  <Card className="glass-card border-none overflow-hidden">
                    <CardHeader className="py-4 border-b border-white/5">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <History className="size-4 text-pink-500" /> Roster logs ({staffHistory.length} records)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/5">
                            <TableHead className="font-bold py-3 pl-6">Roster Date</TableHead>
                            <TableHead className="font-bold py-3 text-right pr-6">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staffHistory.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                No logs found for selected staff member.
                              </TableCell>
                            </TableRow>
                          ) : (
                            staffHistory.map(h => (
                              <TableRow key={h.id} className="border-white/5 hover:bg-muted/10">
                                <TableCell className="py-3 pl-6 font-bold text-sm">
                                  {format(new Date(h.date), "PPPP")}
                                </TableCell>
                                <TableCell className="py-3 text-right pr-6 flex items-center justify-end gap-3 text-foreground">
                                  <Select
                                    value={h.status}
                                    onValueChange={(val: "present" | "absent") => handleUpdateAttendanceStatus(h.id, val)}
                                  >
                                    <SelectTrigger className="w-28 h-8 rounded-lg text-xs font-bold bg-muted/30 border-white/5 text-foreground">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="present" className="text-xs font-semibold text-emerald-500">Present</SelectItem>
                                      <SelectItem value="absent" className="text-xs font-semibold text-rose-500">Absent</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-lg hover:bg-rose-500/20 text-rose-500"
                                    title="Delete Attendance Record"
                                    onClick={() => {
                                      setSelectedAttendanceRecord(h)
                                      setIsDeleteAttendanceOpen(true)
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-center text-muted-foreground">
                  Select a staff member from the left panel to review performance metrics.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 4: Roster Reporting */}
        {activeSubTab === "reports" && (
          <motion.div
            key="reports-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <TrendingUp className="size-5 text-indigo-500" />
                <span className="font-bold text-sm">Report Period:</span>
                <Select value={reportRange} onValueChange={(val: any) => setReportRange(val)}>
                  <SelectTrigger className="w-40 rounded-xl bg-background/50 border-white/10 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">This Week</SelectItem>
                    <SelectItem value="monthly">This Month</SelectItem>
                    <SelectItem value="yearly">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportRange === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={customStart.toISOString().split("T")[0]}
                    onChange={e => setCustomStart(new Date(e.target.value))}
                    className="h-10 rounded-xl border-white/10 bg-background/50 text-xs font-semibold"
                  />
                  <span className="text-muted-foreground font-black text-xs">to</span>
                  <Input
                    type="date"
                    value={customEnd.toISOString().split("T")[0]}
                    onChange={e => setCustomEnd(new Date(e.target.value))}
                    className="h-10 rounded-xl border-white/10 bg-background/50 text-xs font-semibold"
                  />
                </div>
              )}

              <Button
                variant="outline"
                className="rounded-xl border-2 font-bold px-6 h-10 gap-2 hover:bg-muted/30 border-white/10"
                onClick={() => {
                  toast.promise(
                    generateAttendanceReport(reportRange, customStart, customEnd),
                    {
                      loading: "Generating attendance report...",
                      success: "Attendance report generated successfully!",
                      error: "Failed to generate attendance report",
                    }
                  )
                }}
              >
                <FileText className="size-4 text-rose-500" /> Download report
              </Button>
            </div>

            {/* Report Table */}
            <Card className="glass-card border-none overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-white/10">
                      <TableHead className="font-bold py-4 pl-6">Staff Member</TableHead>
                      <TableHead className="font-bold py-4">Role</TableHead>
                      <TableHead className="font-bold py-4 text-center">Tracked Days</TableHead>
                      <TableHead className="font-bold py-4 text-center">Present</TableHead>
                      <TableHead className="font-bold py-4 text-center">Absent</TableHead>
                      <TableHead className="font-bold py-4 text-right pr-6">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                          No roster logs in the selected range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.map(r => (
                        <TableRow key={r.id} className="border-white/10 hover:bg-muted/10">
                          <TableCell className="py-4 pl-6 font-bold flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-pink-500/10 text-pink-600 font-bold flex items-center justify-center text-xs">
                              {r.name.charAt(0)}
                            </div>
                            {r.name}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">{r.role}</TableCell>
                          <TableCell className="font-bold text-center text-sm text-muted-foreground">{r.totalDays} Days</TableCell>
                          <TableCell className="font-bold text-center text-emerald-500 text-sm">{r.presentDays} Days</TableCell>
                          <TableCell className="font-bold text-center text-rose-500 text-sm">{r.absentDays} Days</TableCell>
                          <TableCell className="py-4 text-right pr-6 font-black text-sm">
                            <span className={cn(
                              "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold",
                              r.percentage >= 80 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                              {r.percentage}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>

      {/* CREATE STAFF MODAL */}
      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent className="sm:max-w-[425px] glass-card border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Register Staff Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="staffName" className="font-bold">Full Name *</Label>
              <Input
                id="staffName"
                placeholder="e.g. Ramesh Kumar"
                value={newStaffName}
                onChange={e => setNewStaffName(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="staffRole" className="font-bold">Staff Role *</Label>
              <Input
                id="staffRole"
                placeholder="e.g. Receptionist, Manager, Security"
                value={newStaffRole}
                onChange={e => setNewStaffRole(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staffPhone" className="font-bold">Contact Phone Number</Label>
              <Input
                id="staffPhone"
                placeholder="+91 9000100010"
                value={newStaffPhone}
                onChange={e => setNewStaffPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full rounded-xl font-bold" disabled={addingStaff}>
                {addingStaff && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Registration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT STAFF PROFILE DIALOG */}
      <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
        <DialogContent className="sm:max-w-[425px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Staff Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStaff} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="editStaffName" className="font-bold">Full Name *</Label>
              <Input
                id="editStaffName"
                value={editStaffName}
                onChange={e => setEditStaffName(e.target.value)}
                className="rounded-xl bg-muted/20 text-foreground"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="editStaffRole" className="font-bold">Staff Role *</Label>
              <Input
                id="editStaffRole"
                value={editStaffRole}
                onChange={e => setEditStaffRole(e.target.value)}
                className="rounded-xl bg-muted/20 text-foreground"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editStaffPhone" className="font-bold">Contact Phone Number</Label>
              <Input
                id="editStaffPhone"
                value={editStaffPhone}
                onChange={e => setEditStaffPhone(e.target.value)}
                className="rounded-xl bg-muted/20 text-foreground"
              />
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setIsEditStaffOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl flex-1 font-bold bg-pink-600 hover:bg-pink-700 text-white" disabled={updatingStaff}>
                {updatingStaff && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE STAFF PROFILE DIALOG */}
      <Dialog open={isDeleteStaffOpen} onOpenChange={setIsDeleteStaffOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-500">Delete Staff Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this staff member? This will permanently delete their profile and all their associated attendance history logs. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="pt-4 flex gap-2">
            <Button variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setIsDeleteStaffOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDeleteStaff} disabled={deletingStaff}>
              {deletingStaff && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE ATTENDANCE LOG DIALOG */}
      <Dialog open={isDeleteAttendanceOpen} onOpenChange={setIsDeleteAttendanceOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-500">Delete Attendance Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedAttendanceRecord && (
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete the attendance record on <span className="font-bold text-foreground">{format(new Date(selectedAttendanceRecord.date), "PPPP")}</span>?
              </p>
            )}
          </div>
          <DialogFooter className="pt-4 flex gap-2">
            <Button variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setIsDeleteAttendanceOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDeleteAttendance} disabled={deletingAttendance}>
              {deletingAttendance && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
