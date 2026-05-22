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
  DialogDescription,
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
  Clock,
  ArrowRight,
  ShieldAlert,
  Filter,
  FilterX,
  Coffee,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  subDays,
  startOfDay,
  endOfDay,
  startOfYear,
  endOfYear,
} from "date-fns"
import { generateAttendanceReport } from "@/lib/reports"

export default function AttendancePage() {
  const supabase = createClient()

  // Helper to map DB statuses to UI display labels
  function formatStatusLabel(status: string): string {
    switch (status) {
      case "present":
      case "late":
      case "Full Day":
        return "Full Day"
      case "half_day":
      case "Half Day":
        return "Half Day"
      case "absent":
      case "Absent":
        return "Absent"
      case "on_leave":
      case "holiday":
      case "weekend":
      case "Leave":
        return "Leave"
      case "active_shift":
        return "Active Shift"
      default:
        return status
    }
  }

  // Helper to normalize any status to database constraint format
  function normalizeToDbStatus(status: string): string {
    switch (status) {
      case "Full Day":
      case "present":
      case "late":
        return "present"
      case "Half Day":
      case "half_day":
        return "half_day"
      case "Absent":
      case "absent":
        return "absent"
      case "Leave":
      case "on_leave":
      case "holiday":
      case "weekend":
        return "on_leave"
      case "active_shift":
        return "active_shift"
      default:
        return status
    }
  }
  
  // Navigation State
  const [activeSubTab, setActiveSubTab] = useState<"daily" | "calendar" | "staff" | "reports">("daily")
  
  // Data States
  const [staff, setStaff] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Daily Sheet State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dashboardFilter, setDashboardFilter] = useState<"all" | "present" | "absent" | "active_shift" | "late">("all")

  // Staff Detail Selector
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [staffHistory, setStaffHistory] = useState<any[]>([])
  const [staffHistoryRange, setStaffHistoryRange] = useState<"daily" | "weekly" | "monthly" | "custom">("monthly")
  const [historyDailyDate, setHistoryDailyDate] = useState<Date>(new Date())
  const [historyWeeklyDate, setHistoryWeeklyDate] = useState<Date>(new Date())
  const [historyMonthlyDate, setHistoryMonthlyDate] = useState<Date>(new Date())
  const [historyCustomStart, setHistoryCustomStart] = useState<Date>(subDays(new Date(), 30))
  const [historyCustomEnd, setHistoryCustomEnd] = useState<Date>(new Date())

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  // Reports State
  const [reportRange, setReportRange] = useState<"weekly" | "monthly" | "yearly" | "custom">("monthly")
  const [customStart, setCustomStart] = useState<Date>(subDays(new Date(), 30))
  const [customEnd, setCustomEnd] = useState<Date>(new Date())
  const [reportData, setReportData] = useState<any[]>([])

  // Create Staff Modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false)
  const [newStaffEmpId, setNewStaffEmpId] = useState("")
  const [newStaffName, setNewStaffName] = useState("")
  const [newStaffRole, setNewStaffRole] = useState("")
  const [newStaffDesignation, setNewStaffDesignation] = useState("")
  const [newStaffDept, setNewStaffDept] = useState("")
  const [newStaffPhone, setNewStaffPhone] = useState("")
  const [addingStaff, setAddingStaff] = useState(false)
  
  // Edit Staff Profile Modal
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false)
  const [editStaffEmpId, setEditStaffEmpId] = useState("")
  const [editStaffName, setEditStaffName] = useState("")
  const [editStaffRole, setEditStaffRole] = useState("")
  const [editStaffDesignation, setEditStaffDesignation] = useState("")
  const [editStaffDept, setEditStaffDept] = useState("")
  const [editStaffPhone, setEditStaffPhone] = useState("")
  const [updatingStaff, setUpdatingStaff] = useState(false)

  // Delete Staff Modal
  const [isDeleteStaffOpen, setIsDeleteStaffOpen] = useState(false)
  const [deletingStaff, setDeletingStaff] = useState(false)

  // Clock Out Dialog
  const [isClockOutOpen, setIsClockOutOpen] = useState(false)
  const [clockOutStaff, setClockOutStaff] = useState<any>(null)
  const [clockOutAttendanceId, setClockOutAttendanceId] = useState<string>("")
  const [clockInTimeVal, setClockInTimeVal] = useState<string>("")
  const [clockOutTimeVal, setClockOutTimeVal] = useState<string>("")
  const [clockOutStatus, setClockOutStatus] = useState<"present" | "half_day">("present")
  const [clockOutRemarks, setClockOutRemarks] = useState("")
  const [clockOutDuration, setClockOutDuration] = useState<number>(0)
  const [clockOutWorkingHours, setClockOutWorkingHours] = useState<number>(0)
  const [clockOutOvertime, setClockOutOvertime] = useState<number>(0)
  const [clockOutLateArrival, setClockOutLateArrival] = useState(false)
  const [clockOutEarlyDeparture, setClockOutEarlyDeparture] = useState(false)
  const [submittingClockOut, setSubmittingClockOut] = useState(false)

  // Admin Manual Override Dialog
  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false)
  const [editRecordStaff, setEditRecordStaff] = useState<any>(null)
  const [editRecordAttendance, setEditRecordAttendance] = useState<any>(null)
  const [editRecordStatus, setEditRecordStatus] = useState<string>("present")
  const [editRecordClockIn, setEditRecordClockIn] = useState<string>("")
  const [editRecordClockOut, setEditRecordClockOut] = useState<string>("")
  const [editRecordRemarks, setEditRecordRemarks] = useState("")
  const [editRecordDuration, setEditRecordDuration] = useState<number>(0)
  const [editRecordWorkingHours, setEditRecordWorkingHours] = useState<number>(0)
  const [editRecordOvertime, setEditRecordOvertime] = useState<number>(0)
  const [editRecordLateArrival, setEditRecordLateArrival] = useState(false)
  const [editRecordEarlyDeparture, setEditRecordEarlyDeparture] = useState(false)
  const [submittingRecordEdit, setSubmittingRecordEdit] = useState(false)

  // Delete Attendance Log Modal
  const [isDeleteAttendanceOpen, setIsDeleteAttendanceOpen] = useState(false)
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<any>(null)
  const [deleteRecordRemarks, setDeleteRecordRemarks] = useState("")
  const [deletingAttendance, setDeletingAttendance] = useState(false)

  // Audit Trail Dialog
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)

  useEffect(() => {
    fetchStaffAndAllAttendance()

    const channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => fetchStaffAndAllAttendance())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchStaffAndAllAttendance())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_audit_logs' }, () => {
        // Refresh audit logs if open
        if (isAuditTrailOpen) {
          fetchAuditLogs()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuditTrailOpen])

  useEffect(() => {
    if (staff.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staff[0].id)
    }
  }, [staff])

  useEffect(() => {
    if (selectedStaffId) {
      const bounds = getHistoryDateBounds()
      const records = attendance
        .filter(a => {
          if (a.staff_id !== selectedStaffId) return false
          const aDate = new Date(a.date)
          return aDate >= bounds.start && aDate <= bounds.end
        })
        .sort((a, b) => b.date.localeCompare(a.date))
      setStaffHistory(records)
    } else {
      setStaffHistory([])
    }
  }, [selectedStaffId, attendance, staffHistoryRange, historyDailyDate, historyWeeklyDate, historyMonthlyDate, historyCustomStart, historyCustomEnd])

  useEffect(() => {
    generateReports()
  }, [reportRange, customStart, customEnd, attendance, staff])

  // Live calculation for Clock Out dialog
  useEffect(() => {
    if (clockInTimeVal && clockOutTimeVal) {
      const calc = calculateAttendanceMetrics(clockInTimeVal, clockOutTimeVal)
      const diffMs = new Date(clockOutTimeVal).getTime() - new Date(clockInTimeVal).getTime()
      const dur = Math.max(0, diffMs / (1000 * 60 * 60))
      setClockOutDuration(Math.round(dur * 100) / 100)
      setClockOutWorkingHours(calc.workingHours)
      setClockOutOvertime(calc.overtimeHours)
      setClockOutLateArrival(calc.lateArrival)
      setClockOutEarlyDeparture(calc.earlyDeparture)
      setClockOutStatus(calc.status)
    }
  }, [clockInTimeVal, clockOutTimeVal])

  // Live calculation for Edit Record dialog
  useEffect(() => {
    if (["present", "half_day", "active_shift"].includes(editRecordStatus)) {
      if (editRecordClockIn && editRecordClockOut) {
        const calc = calculateAttendanceMetrics(editRecordClockIn, editRecordClockOut)
        const diffMs = new Date(editRecordClockOut).getTime() - new Date(editRecordClockIn).getTime()
        const dur = Math.max(0, diffMs / (1000 * 60 * 60))
        setEditRecordDuration(Math.round(dur * 100) / 100)
        setEditRecordWorkingHours(calc.workingHours)
        setEditRecordOvertime(calc.overtimeHours)
        setEditRecordLateArrival(calc.lateArrival)
        setEditRecordEarlyDeparture(calc.earlyDeparture)
      } else {
        setEditRecordDuration(0)
        setEditRecordWorkingHours(0)
        setEditRecordOvertime(0)
        setEditRecordLateArrival(false)
        setEditRecordEarlyDeparture(false)
      }
    } else {
      setEditRecordDuration(0)
      setEditRecordWorkingHours(0)
      setEditRecordOvertime(0)
      setEditRecordLateArrival(false)
      setEditRecordEarlyDeparture(false)
    }
  }, [editRecordStatus, editRecordClockIn, editRecordClockOut])

  // Helper to calculate hours, overtime, late/early flags
  function calculateAttendanceMetrics(clockInStr: string, clockOutStr: string) {
    const inDate = new Date(clockInStr)
    const outDate = new Date(clockOutStr)
    
    const diffMs = outDate.getTime() - inDate.getTime()
    if (diffMs <= 0) {
      return {
        workingHours: 0,
        overtimeHours: 0,
        lateArrival: false,
        earlyDeparture: false,
        status: "present" as const
      }
    }
    
    const durationHours = diffMs / (1000 * 60 * 60)
    
    // Late Arrival: check if clock-in is after 09:00 AM on the day of clock-in
    const nineAM = new Date(inDate)
    nineAM.setHours(9, 0, 0, 0)
    const lateArrival = inDate > nineAM
    
    // Early Departure: check if clock-out is before 05:00 PM
    const fivePM = new Date(outDate)
    fivePM.setHours(17, 0, 0, 0)
    const earlyDeparture = outDate < fivePM
    
    // Working hours and overtime calculation
    let workingHours = durationHours
    let overtimeHours = 0
    if (durationHours > 8) {
      workingHours = 8
      overtimeHours = durationHours - 8
    }
    
    // Status determination
    let status: "present" | "half_day" = "present"
    if (durationHours < 4) {
      status = "half_day"
    }
    
    return {
      workingHours: Math.round(workingHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      lateArrival,
      earlyDeparture,
      status
    }
  }

  // Retrieve current active user email for audit logs
  async function getAdminEmail() {
    const { data } = await supabase.auth.getUser()
    return data?.user?.email || "admin@staymanager.com"
  }

  // Insert audit trail log helper
  async function insertAuditLog(
    action: "CLOCK_IN" | "CLOCK_OUT" | "UPDATE" | "DELETE",
    attendanceId: string,
    oldRec: any | null,
    newRec: any | null,
    remarks: string
  ) {
    try {
      const email = await getAdminEmail()
      const { error } = await supabase
        .from("attendance_audit_logs")
        .insert([{
          attendance_id: attendanceId,
          modified_by: email,
          action,
          old_status: oldRec?.status || null,
          new_status: newRec?.status || null,
          old_clock_in: oldRec?.clock_in || null,
          new_clock_in: newRec?.clock_in || null,
          old_clock_out: oldRec?.clock_out || null,
          new_clock_out: newRec?.clock_out || null,
          remarks: remarks || null
        }])
      if (error) throw error
    } catch (err) {
      console.error("Audit log insertion failed:", err)
    }
  }

  async function fetchStaffAndAllAttendance() {
    setLoading(true)
    try {
      // 1. Fetch active staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true })
      
      setStaff(staffData || [])

      // 2. Fetch all attendance records
      const { data: attData } = await supabase
        .from("attendance")
        .select("*, staff(name, role, employee_id, designation, department)")
        .order("date", { ascending: false })
      
      setAttendance(attData || [])
    } catch (err) {
      console.error(err)
      toast.error("Failed to load staff list")
    } finally {
      setLoading(false)
    }
  }

  async function fetchAuditLogs() {
    setLoadingAudit(true)
    try {
      const { data, error } = await supabase
        .from("attendance_audit_logs")
        .select(`
          *,
          attendance:attendance_id (
            date,
            staff:staff_id (
              name,
              employee_id
            )
          )
        `)
        .order("modified_at", { ascending: false })
      if (error) throw error
      setAuditLogs(data || [])
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load audit logs: " + err.message)
    } finally {
      setLoadingAudit(false)
    }
  }

  const getHistoryDateBounds = () => {
    let start: Date
    let end: Date = new Date()

    switch (staffHistoryRange) {
      case "daily":
        start = startOfDay(historyDailyDate)
        end = endOfDay(historyDailyDate)
        break
      case "weekly":
        start = startOfWeek(historyWeeklyDate, { weekStartsOn: 1 })
        end = endOfWeek(historyWeeklyDate, { weekStartsOn: 1 })
        break
      case "monthly":
        start = startOfMonth(historyMonthlyDate)
        end = endOfMonth(historyMonthlyDate)
        break
      case "custom":
        start = startOfDay(historyCustomStart)
        end = endOfDay(historyCustomEnd)
        break
      default:
        start = startOfMonth(new Date())
        end = endOfMonth(new Date())
    }
    return { start, end }
  }

  // Open staff add dialog with random generated EMP ID
  const handleOpenAddStaff = () => {
    setNewStaffEmpId("EMP-" + Math.floor(100000 + Math.random() * 900000))
    setNewStaffName("")
    setNewStaffRole("")
    setNewStaffDesignation("")
    setNewStaffDept("")
    setNewStaffPhone("")
    setIsAddStaffOpen(true)
  }

  // Add new staff member
  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!newStaffName.trim() || !newStaffEmpId.trim()) {
      toast.error("Please fill in the required fields")
      return
    }
    setAddingStaff(true)
    try {
      const { data, error } = await supabase
        .from("staff")
        .insert([{
          employee_id: newStaffEmpId.trim(),
          name: newStaffName.trim(),
          role: newStaffRole.trim() || "Staff",
          designation: newStaffDesignation.trim() || null,
          department: newStaffDept.trim() || null,
          phone_number: newStaffPhone.trim() || null,
          is_active: true
        }])
        .select()

      if (error) {
        if (error.code === "23505") {
          throw new Error("Employee ID already exists. Please use a unique ID.")
        }
        throw error
      }
      toast.success(`Staff member "${newStaffName}" registered successfully`)
      setIsAddStaffOpen(false)
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error(err.message || "Error adding staff")
    } finally {
      setAddingStaff(false)
    }
  }

  // Edit Staff Profile
  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!editStaffName.trim() || !editStaffEmpId.trim() || !selectedStaffId) return
    setUpdatingStaff(true)
    try {
      const { error } = await supabase
        .from("staff")
        .update({
          employee_id: editStaffEmpId.trim(),
          name: editStaffName.trim(),
          role: editStaffRole.trim() || "Staff",
          designation: editStaffDesignation.trim() || null,
          department: editStaffDept.trim() || null,
          phone_number: editStaffPhone.trim() || null,
        })
        .eq("id", selectedStaffId)

      if (error) {
        if (error.code === "23505") {
          throw new Error("Employee ID already exists. Please use a unique ID.")
        }
        throw error
      }
      toast.success("Staff profile updated successfully")
      setIsEditStaffOpen(false)
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error(err.message || "Failed to update staff profile")
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

  // Clock In Action
  const getClockTime = (date: Date) => {
    const now = new Date()
    const target = new Date(date)
    target.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
    return target.toISOString()
  }

  async function handleClockIn(staffId: string) {
    const dateStr = selectedDate.toISOString().split("T")[0]
    const clockInTime = getClockTime(selectedDate)
    
    // Check if after 09:00 AM
    const checkInDate = new Date(clockInTime)
    const nineAM = new Date(checkInDate)
    nineAM.setHours(9, 0, 0, 0)
    const isLate = checkInDate > nineAM

    try {
      // 1. Insert clock-in attendance record
      const { data, error } = await supabase
        .from("attendance")
        .insert([{
          staff_id: staffId,
          date: dateStr,
          status: "active_shift",
          clock_in: clockInTime,
          late_arrival: isLate,
          working_hours: 0,
          overtime_hours: 0,
        }])
        .select()

      if (error) throw error
      
      const newRecord = data?.[0]
      if (newRecord) {
        // 2. Audit Log
        await insertAuditLog("CLOCK_IN", newRecord.id, null, newRecord, "Clock In recorded by system")
      }
      
      toast.success("Clock-in recorded successfully")
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Clock In failed: " + err.message)
    }
  }

  // Mark Absent Action
  async function handleMarkAbsent(staffId: string) {
    const dateStr = selectedDate.toISOString().split("T")[0]
    try {
      const { data, error } = await supabase
        .from("attendance")
        .insert([{
          staff_id: staffId,
          date: dateStr,
          status: "absent",
          clock_in: null,
          clock_out: null,
          working_hours: 0,
          overtime_hours: 0,
          late_arrival: false,
          early_departure: false
        }])
        .select()

      if (error) throw error

      const newRecord = data?.[0]
      if (newRecord) {
        await insertAuditLog("UPDATE", newRecord.id, null, newRecord, "Marked absent by system")
      }

      toast.success("Staff marked as Absent")
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Failed to mark absent: " + err.message)
    }
  }

  // Mark Leave Action
  async function handleMarkLeave(staffId: string) {
    const dateStr = selectedDate.toISOString().split("T")[0]
    try {
      const { data, error } = await supabase
        .from("attendance")
        .insert([{
          staff_id: staffId,
          date: dateStr,
          status: "on_leave",
          clock_in: null,
          clock_out: null,
          working_hours: 0,
          overtime_hours: 0,
          late_arrival: false,
          early_departure: false
        }])
        .select()

      if (error) throw error

      const newRecord = data?.[0]
      if (newRecord) {
        await insertAuditLog("UPDATE", newRecord.id, null, newRecord, "Marked as Leave")
      }

      toast.success("Staff marked as Leave")
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Failed to mark Leave: " + err.message)
    }
  }

  // Open Clock Out modal
  const handleOpenClockOut = (staffMember: any, record: any) => {
    setClockOutStaff(staffMember)
    setClockOutAttendanceId(record.id)
    setClockInTimeVal(record.clock_in)
    
    // Default clock out to selected date with current time
    const clockOutStr = getClockTime(selectedDate)
    setClockOutTimeVal(clockOutStr.substring(0, 16)) // datetime-local format format: YYYY-MM-DDTHH:mm
    setClockInTimeVal(record.clock_in.substring(0, 16))
    setClockOutRemarks("")
    setIsClockOutOpen(true)
  }

  // Confirm Clock Out
  async function handleConfirmClockOut(e: React.FormEvent) {
    e.preventDefault()
    if (!clockOutTimeVal) return
    setSubmittingClockOut(true)

    try {
      // Get the existing record first
      const { data: oldData } = await supabase
        .from("attendance")
        .select("*")
        .eq("id", clockOutAttendanceId)
        .single()

      // Perform update
      const { data, error } = await supabase
        .from("attendance")
        .update({
          status: clockOutStatus,
          clock_out: new Date(clockOutTimeVal).toISOString(),
          working_hours: clockOutWorkingHours,
          overtime_hours: clockOutOvertime,
          late_arrival: clockOutLateArrival,
          early_departure: clockOutEarlyDeparture,
          remarks: clockOutRemarks.trim() || null
        })
        .eq("id", clockOutAttendanceId)
        .select()

      if (error) throw error

      const newRecord = data?.[0]
      if (newRecord) {
        await insertAuditLog("CLOCK_OUT", clockOutAttendanceId, oldData, newRecord, clockOutRemarks.trim() || "Clock out confirmed")
      }

      toast.success(`Clock out complete for ${clockOutStaff?.name}`)
      setIsClockOutOpen(false)
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Clock Out failed: " + err.message)
    } finally {
      setSubmittingClockOut(false)
    }
  }

  // Open Edit Attendance Record Modal
  const handleOpenEditRecord = (staffMember: any, record: any) => {
    setEditRecordStaff(staffMember)
    setEditRecordAttendance(record)
    setEditRecordStatus(normalizeToDbStatus(record.status))
    setEditRecordClockIn(record.clock_in ? record.clock_in.substring(0, 16) : "")
    setEditRecordClockOut(record.clock_out ? record.clock_out.substring(0, 16) : "")
    setEditRecordRemarks(record.remarks || "")
    setIsEditRecordOpen(true)
  }

  // Submit Admin Edit Record
  async function handleSaveRecordEdit(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingRecordEdit(true)

    const isTimedStatus = ["present", "half_day", "active_shift"].includes(editRecordStatus)
    const inTime = isTimedStatus && editRecordClockIn ? new Date(editRecordClockIn).toISOString() : null
    const outTime = isTimedStatus && editRecordClockOut ? new Date(editRecordClockOut).toISOString() : null

    try {
      const { data: oldData } = await supabase
        .from("attendance")
        .select("*")
        .eq("id", editRecordAttendance.id)
        .single()

      const { data, error } = await supabase
        .from("attendance")
        .update({
          status: editRecordStatus,
          clock_in: inTime,
          clock_out: outTime,
          working_hours: isTimedStatus ? editRecordWorkingHours : 0,
          overtime_hours: isTimedStatus ? editRecordOvertime : 0,
          late_arrival: isTimedStatus ? editRecordLateArrival : false,
          early_departure: isTimedStatus ? editRecordEarlyDeparture : false,
          remarks: editRecordRemarks.trim() || null
        })
        .eq("id", editRecordAttendance.id)
        .select()

      if (error) throw error

      const newRecord = data?.[0]
      if (newRecord) {
        await insertAuditLog(
          "UPDATE",
          editRecordAttendance.id,
          oldData,
          newRecord,
          editRecordRemarks.trim() || "Admin manual override update"
        )
      }

      toast.success("Attendance record updated successfully")
      setIsEditRecordOpen(false)
      fetchStaffAndAllAttendance()
    } catch (err: any) {
      toast.error("Failed to update record: " + err.message)
    } finally {
      setSubmittingRecordEdit(false)
    }
  }

  // Open Delete Attendance Modal
  const handleOpenDeleteAttendance = (record: any) => {
    setSelectedAttendanceRecord(record)
    setDeleteRecordRemarks("")
    setIsDeleteAttendanceOpen(true)
  }

  // Delete Attendance Log Action
  async function handleDeleteAttendance() {
    if (!selectedAttendanceRecord) return
    setDeletingAttendance(true)
    try {
      // Fetch old data for audit
      const { data: oldData } = await supabase
        .from("attendance")
        .select("*")
        .eq("id", selectedAttendanceRecord.id)
        .single()

      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("id", selectedAttendanceRecord.id)

      if (error) throw error

      await insertAuditLog(
        "DELETE",
        selectedAttendanceRecord.id,
        oldData,
        null,
        deleteRecordRemarks.trim() || "Admin manual deletion"
      )

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

  // Generate Reports & Calculate Statistics
  function generateReports() {
    if (staff.length === 0) return

    let start: Date
    let end: Date = new Date()

    if (reportRange === "weekly") {
      start = startOfWeek(new Date(), { weekStartsOn: 1 })
      end = endOfWeek(new Date(), { weekStartsOn: 1 })
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
      const present = records.filter(a => ["Full Day", "Half Day", "active_shift", "present", "half_day", "late"].includes(a.status)).length
      const absent = records.filter(a => ["Absent", "absent"].includes(a.status)).length
      const leaves = records.filter(a => ["Leave", "on_leave", "holiday", "weekend"].includes(a.status)).length
      const active = records.filter(a => a.status === "active_shift").length
      const workingHoursSum = records.reduce((acc, a) => acc + Number(a.working_hours || 0), 0)
      const overtimeHoursSum = records.reduce((acc, a) => acc + Number(a.overtime_hours || 0), 0)

      const denominator = total - leaves
      const percentage = denominator > 0 ? Math.round((present / denominator) * 100) : 0

      return {
        id: s.id,
        name: s.name,
        employee_id: s.employee_id,
        role: s.role,
        designation: s.designation,
        department: s.department,
        totalDays: total,
        presentDays: present,
        absentDays: absent,
        leaveDays: leaves,
        activeShifts: active,
        totalHours: workingHoursSum,
        totalOvertime: overtimeHoursSum,
        percentage
      }
    })

    setReportData(list)
  }

  // Dashboard calculations for selected date
  const getDashboardMetrics = () => {
    const dateStr = selectedDate.toISOString().split("T")[0]
    const dayRecords = attendance.filter(a => a.date === dateStr)
    
    const totalStaffCount = staff.length
    const presentToday = dayRecords.filter(a => ["Full Day", "Half Day", "active_shift", "present", "half_day", "late"].includes(a.status)).length
    const absentToday = dayRecords.filter(a => ["Absent", "absent"].includes(a.status)).length
    const activeShifts = dayRecords.filter(a => a.status === "active_shift").length
    const lateArrivals = dayRecords.filter(a => a.late_arrival).length

    return {
      totalStaffCount,
      presentToday,
      absentToday,
      activeShifts,
      lateArrivals
    }
  }

  const metrics = getDashboardMetrics()

  // Selected staff analytics for Staff History tab
  const getSelectedStaffAnalytics = () => {
    if (staffHistory.length === 0) {
      return { fullDays: 0, halfDays: 0, leaves: 0, absent: 0, present: 0, hours: 0, overtime: 0, rate: 0, total: 0 }
    }
    const fullDays = staffHistory.filter(h => ["Full Day", "present", "late"].includes(h.status)).length
    const halfDays = staffHistory.filter(h => ["Half Day", "half_day"].includes(h.status)).length
    const activeShifts = staffHistory.filter(h => h.status === "active_shift").length
    const absent = staffHistory.filter(h => ["Absent", "absent"].includes(h.status)).length
    const leaves = staffHistory.filter(h => ["Leave", "on_leave", "holiday", "weekend"].includes(h.status)).length
    const present = fullDays + halfDays + activeShifts
    const hours = staffHistory.reduce((acc, h) => acc + Number(h.working_hours || 0), 0)
    const overtime = staffHistory.reduce((acc, h) => acc + Number(h.overtime_hours || 0), 0)
    const total = staffHistory.length

    const denominator = total - leaves
    const rate = denominator > 0 ? Math.round((present / denominator) * 100) : 0

    return {
      fullDays,
      halfDays,
      leaves,
      absent,
      present,
      hours: Math.round(hours * 10) / 10,
      overtime: Math.round(overtime * 10) / 10,
      rate,
      total
    }
  }

  const staffAnalytics = getSelectedStaffAnalytics()

  // Days in month for Attendance Calendar grid
  const getMonthDays = () => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }

  const calendarDays = getMonthDays()

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Filter daily list of staff based on dashboard filter selection
  const getFilteredDailyStaff = () => {
    const dateStr = selectedDate.toISOString().split("T")[0]
    return staff.filter(s => {
      const record = attendance.find(a => a.staff_id === s.id && a.date === dateStr)
      const status = record ? record.status : null
      const isLate = record ? record.late_arrival : false

      if (dashboardFilter === "all") return true
      if (dashboardFilter === "present") return record && ["Full Day", "Half Day", "active_shift", "present", "half_day", "late"].includes(status)
      if (dashboardFilter === "absent") return record && ["Absent", "absent"].includes(status)
      if (dashboardFilter === "active_shift") return record && status === "active_shift"
      if (dashboardFilter === "late") return isLate
      return true
    })
  }

  const filteredDailyStaff = getFilteredDailyStaff()

  const formatClockTime = (timeStr: string | null) => {
    if (!timeStr) return "-"
    try {
      return format(new Date(timeStr), "hh:mm a")
    } catch (e) {
      return "-"
    }
  }

  const getStatusBadge = (status: string) => {
    const label = formatStatusLabel(status)
    switch (label) {
      case "Full Day":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold">Full Day</Badge>
      case "Half Day":
        return <Badge className="bg-orange-500/10 text-orange-500 border-none font-bold">Half Day</Badge>
      case "Absent":
        return <Badge className="bg-rose-500/10 text-rose-500 border-none font-bold">Absent</Badge>
      case "Leave":
        return <Badge className="bg-sky-500/10 text-sky-500 border-none font-bold">Leave</Badge>
      case "Active Shift":
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border-none font-bold animate-pulse inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-blue-400"></span> Active Shift
          </Badge>
        )
      default:
        return <Badge className="bg-muted text-muted-foreground border-none font-bold">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-foreground">
      
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">Time & Attendance</h2>
          <p className="text-muted-foreground font-medium text-sm">
            Monitor real-time clock-ins, review automatic overtime calculations, and download audit-tracked history logs.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline"
            className="rounded-xl border border-white/10 dark:border-white/5 bg-muted/20 hover:bg-muted/30 font-bold h-11 px-5 text-sm gap-2"
            onClick={() => {
              fetchAuditLogs()
              setIsAuditTrailOpen(true)
            }}
          >
            <History className="size-4 text-indigo-400" /> View Audit Trail
          </Button>
          <Button 
            className="rounded-xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-pink-500/20 h-11 px-6 text-sm"
            onClick={handleOpenAddStaff}
          >
            <Plus className="mr-2 h-5 w-5" /> Register Staff
          </Button>
        </div>
      </div>

      {/* Interactive Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: "all", label: "Total Staff", value: metrics.totalStaffCount, color: "border-slate-500/20 bg-slate-500/5 text-slate-400" },
          { key: "present", label: "Present Today", value: metrics.presentToday, color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" },
          { key: "absent", label: "Absent Today", value: metrics.absentToday, color: "border-rose-500/20 bg-rose-500/5 text-rose-400" },
          { key: "active_shift", label: "Active Shifts", value: metrics.activeShifts, color: "border-blue-500/20 bg-blue-500/5 text-blue-400 animate-pulse-slow" },
          { key: "late", label: "Late Arrivals", value: metrics.lateArrivals, color: "border-amber-500/20 bg-amber-500/5 text-amber-400" }
        ].map(card => {
          const isActive = dashboardFilter === card.key
          return (
            <Card 
              key={card.key}
              onClick={() => setDashboardFilter(isActive ? "all" : (card.key as any))}
              className={cn(
                "glass-card border cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]",
                card.color,
                isActive ? "ring-2 ring-primary border-primary bg-primary/10" : ""
              )}
            >
              <CardContent className="p-5 flex flex-col justify-between h-24">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{card.label}</span>
                <span className="text-3xl font-black">{card.value}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Roster & Dashboard Navigation Sub-Tabs */}
      <div className="flex border-b border-white/10 dark:border-white/5 pb-1 gap-6">
        {[
          { key: "daily", label: "Daily Sheet", icon: ClipboardList },
          { key: "calendar", label: "Monthly Calendar", icon: CalendarDays },
          { key: "staff", label: "Staff History", icon: Users },
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
                <span className="font-bold text-sm">Roster Assignment Date:</span>
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

              {/* Active Filter Indication */}
              {dashboardFilter !== "all" && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl text-xs font-bold text-primary">
                  <Filter className="size-3.5" />
                  Filter: {dashboardFilter.replace('_', ' ')} list active
                  <button onClick={() => setDashboardFilter("all")} className="hover:text-foreground pl-1.5">
                    <FilterX className="size-3.5" />
                  </button>
                </div>
              )}
            </div>

            <Card className="glass-card border-none overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-white/10">
                      <TableHead className="font-bold py-4 pl-6">ID & Staff Name</TableHead>
                      <TableHead className="font-bold py-4">Dept / Designation</TableHead>
                      <TableHead className="font-bold py-4">Shift Details</TableHead>
                      <TableHead className="font-bold py-4">Remarks</TableHead>
                      <TableHead className="font-bold py-4 text-center">Status Badge</TableHead>
                      <TableHead className="font-bold py-4 text-right pr-6">Attendance Operations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-semibold">
                          Loading roster sheet...
                        </TableCell>
                      </TableRow>
                    ) : filteredDailyStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-semibold">
                          {dashboardFilter === "all" 
                            ? "No staff profiles registered. Add staff members above."
                            : "No staff records match the active dashboard filter for this date."
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDailyStaff.map(s => {
                        const dateStr = selectedDate.toISOString().split("T")[0]
                        const record = attendance.find(a => a.staff_id === s.id && a.date === dateStr)
                        
                        return (
                          <TableRow key={s.id} className="border-white/10 hover:bg-muted/10">
                            {/* Name & ID */}
                            <TableCell className="py-4 pl-6 font-bold flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-pink-500/10 text-pink-500 font-bold flex items-center justify-center text-sm border border-pink-500/10">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-foreground">{s.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{s.employee_id}</div>
                              </div>
                            </TableCell>

                            {/* Department / Designation */}
                            <TableCell className="font-semibold text-sm">
                              <div>{s.department || "Front Desk"}</div>
                              <div className="text-[11px] text-muted-foreground font-medium">{s.designation || s.role}</div>
                            </TableCell>

                            {/* Shift duration & details */}
                            <TableCell className="font-medium text-xs">
                              {record ? (
                                ["Full Day", "Half Day", "active_shift", "present", "half_day", "late"].includes(record.status) ? (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Clock className="size-3" />
                                      <span>In: {formatClockTime(record.clock_in)}</span>
                                    </div>
                                    {record.clock_out && (
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <ArrowRight className="size-3" />
                                        <span>Out: {formatClockTime(record.clock_out)}</span>
                                      </div>
                                    )}
                                    {record.working_hours > 0 && (
                                      <div className="text-[10px] font-bold text-indigo-400">
                                        Work: {record.working_hours}h {record.overtime_hours > 0 && `(OT: +${record.overtime_hours}h)`}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/60 italic">No shift hours</span>
                                )
                              ) : (
                                <span className="text-muted-foreground/45 italic">Not started</span>
                              )}
                            </TableCell>

                            {/* Remarks */}
                            <TableCell className="font-medium text-xs max-w-[150px] truncate text-muted-foreground" title={record?.remarks || ""}>
                              {record?.remarks || "-"}
                            </TableCell>

                            {/* Status Badge */}
                            <TableCell className="text-center py-4">
                              {record ? getStatusBadge(record.status) : <span className="text-[11px] text-muted-foreground font-medium">Unmarked</span>}
                            </TableCell>

                            {/* Operations */}
                            <TableCell className="text-right py-4 pr-6">
                              {!record ? (
                                <div className="flex justify-end items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    className="rounded-lg font-bold text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                    onClick={() => handleClockIn(s.id)}
                                  >
                                    <Check className="size-3.5" /> Clock In
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-lg font-bold text-xs h-8 border-rose-500/20 text-rose-500 hover:bg-rose-500/10 gap-1"
                                    onClick={() => handleMarkAbsent(s.id)}
                                  >
                                    <X className="size-3.5" /> Mark Absent
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-lg font-bold text-xs h-8 border-sky-500/20 text-sky-500 hover:bg-sky-500/10 gap-1"
                                    onClick={() => handleMarkLeave(s.id)}
                                  >
                                    <Coffee className="size-3.5" /> Mark Leave
                                  </Button>
                                </div>
                              ) : record.status === "active_shift" ? (
                                <Button
                                  size="sm"
                                  className="rounded-lg font-bold text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                                  onClick={() => handleOpenClockOut(s, record)}
                                >
                                  <Clock className="size-3.5" /> Clock Out
                                </Button>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground"
                                    title="Edit Record"
                                    onClick={() => handleOpenEditRecord(s, record)}
                                  >
                                    <Edit2 className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-lg hover:bg-rose-500/20 text-rose-500"
                                    title="Delete Record"
                                    onClick={() => handleOpenDeleteAttendance(record)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              )}
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
                  const present = dayRecords.filter(a => ["Full Day", "Half Day", "present", "half_day", "late"].includes(a.status)).length
                  const absent = dayRecords.filter(a => ["Absent", "absent"].includes(a.status)).length
                  const active = dayRecords.filter(a => a.status === "active_shift").length
                  const leaves = dayRecords.filter(a => ["Leave", "on_leave", "holiday", "weekend"].includes(a.status)).length
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
                        <div className="space-y-0.5 w-full text-[9px] font-bold">
                          {present > 0 && (
                            <div className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex justify-between">
                              <span>Pres:</span>
                              <span>{present}</span>
                            </div>
                          )}
                          {active > 0 && (
                            <div className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md flex justify-between animate-pulse">
                              <span>Act:</span>
                              <span>{active}</span>
                            </div>
                          )}
                          {absent > 0 && (
                            <div className="text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md flex justify-between">
                              <span>Abs:</span>
                              <span>{absent}</span>
                            </div>
                          )}
                          {leaves > 0 && (
                            <div className="text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded-md flex justify-between">
                              <span>Leave:</span>
                              <span>{leaves}</span>
                            </div>
                          )}
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

        {/* Tab 3: Staff History & Profile Reports */}
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
                <CardTitle className="text-lg font-bold">Registered Staff</CardTitle>
                <CardDescription>Select profile to review shift logs</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                {staff.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-6">No staff members registered.</div>
                ) : (
                  staff.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStaffId(s.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all duration-300",
                        selectedStaffId === s.id
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-md shadow-primary/5"
                          : "bg-muted/10 border-white/5 hover:bg-muted/20 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-sm border border-primary/10 text-primary">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate text-foreground">{s.name}</div>
                        <div className="text-[10px] truncate text-muted-foreground font-mono">{s.employee_id}</div>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Right Detailed History & Analytics */}
            <div className="lg:col-span-2 space-y-6">
              {selectedStaffId ? (
                <>
                  {(() => {
                    const currentStaff = staff.find(s => s.id === selectedStaffId)
                    if (!currentStaff) return null
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 border border-white/5 p-5 rounded-2xl">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-2xl font-extrabold">{currentStaff.name}</h4>
                            <Badge className="bg-muted text-muted-foreground border-white/5 text-[10px] font-mono">{currentStaff.employee_id}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-semibold mt-1">
                            {currentStaff.department ? `${currentStaff.department} ` : "Front Office "} 
                            • {currentStaff.designation || currentStaff.role || "Staff"}
                            {currentStaff.phone_number ? ` • Contact: ${currentStaff.phone_number}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="rounded-xl font-bold border-white/10 bg-muted/10 hover:bg-white/5 text-foreground h-9 px-4 text-xs"
                            onClick={() => {
                              setEditStaffEmpId(currentStaff.employee_id)
                              setEditStaffName(currentStaff.name)
                              setEditStaffRole(currentStaff.role || "")
                              setEditStaffDesignation(currentStaff.designation || "")
                              setEditStaffDept(currentStaff.department || "")
                              setEditStaffPhone(currentStaff.phone_number || "")
                              setIsEditStaffOpen(true)
                            }}
                          >
                            Edit Profile
                          </Button>
                          <Button
                            variant="destructive"
                            className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 h-9 px-4 text-xs text-white"
                            onClick={() => setIsDeleteStaffOpen(true)}
                          >
                            Delete Profile
                          </Button>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Profile Period Filter */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/10 border border-white/5 p-4 rounded-xl justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="size-4 text-indigo-400" />
                      <span className="font-bold text-sm">Analytics Range:</span>
                      <Select value={staffHistoryRange} onValueChange={(val: any) => {
                        setHistoryWeeklyDate(new Date());
                        setHistoryMonthlyDate(new Date());
                        setHistoryDailyDate(new Date());
                        setStaffHistoryRange(val);
                      }}>
                        <SelectTrigger className="w-36 rounded-lg bg-background/50 border-white/10 font-bold text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                          <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                          <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                          <SelectItem value="custom" className="text-xs">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {staffHistoryRange === "daily" && (
                      <Input
                        type="date"
                        value={historyDailyDate.toISOString().split("T")[0]}
                        onChange={e => setHistoryDailyDate(new Date(e.target.value))}
                        className="h-9 rounded-lg border-white/10 bg-background/50 text-xs font-semibold w-36"
                      />
                    )}

                    {staffHistoryRange === "weekly" && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={historyWeeklyDate.toISOString().split("T")[0]}
                          onChange={e => setHistoryWeeklyDate(new Date(e.target.value))}
                          className="h-9 rounded-lg border-white/10 bg-background/50 text-xs font-semibold w-36"
                        />
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          ({format(startOfWeek(historyWeeklyDate, { weekStartsOn: 1 }), "MMM d")} - {format(endOfWeek(historyWeeklyDate, { weekStartsOn: 1 }), "MMM d")})
                        </span>
                      </div>
                    )}

                    {staffHistoryRange === "monthly" && (
                      <Input
                        type="month"
                        value={format(historyMonthlyDate, "yyyy-MM")}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            const [year, month] = val.split("-");
                            setHistoryMonthlyDate(new Date(Number(year), Number(month) - 1, 1));
                          }
                        }}
                        className="h-9 rounded-lg border-white/10 bg-background/50 text-xs font-semibold w-36"
                      />
                    )}

                    {staffHistoryRange === "custom" && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={historyCustomStart.toISOString().split("T")[0]}
                          onChange={e => setHistoryCustomStart(new Date(e.target.value))}
                          className="h-9 rounded-lg border-white/10 bg-background/50 text-xs font-semibold w-32"
                        />
                        <span className="text-muted-foreground font-black text-xs">to</span>
                        <Input
                          type="date"
                          value={historyCustomEnd.toISOString().split("T")[0]}
                          onChange={e => setHistoryCustomEnd(new Date(e.target.value))}
                          className="h-9 rounded-lg border-white/10 bg-background/50 text-xs font-semibold w-32"
                        />
                      </div>
                    )}
                  </div>

                  {/* Profile Performance Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="glass-card border-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Attendance Rate</span>
                        <span className="text-3xl font-black text-primary mt-1">{staffAnalytics.rate}%</span>
                        <span className="text-[9px] text-muted-foreground/80 mt-1 font-semibold">Excludes leave days</span>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Days</span>
                        <span className="text-3xl font-black text-emerald-500 mt-1">{staffAnalytics.fullDays} Days</span>
                        <span className="text-[9px] text-muted-foreground/80 mt-1 font-semibold">Standard 8h shifts</span>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Half Days</span>
                        <span className="text-3xl font-black text-amber-500 mt-1">{staffAnalytics.halfDays} Days</span>
                        <span className="text-[9px] text-muted-foreground/80 mt-1 font-semibold">Timed partial shifts</span>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved Leaves</span>
                        <span className="text-3xl font-black text-sky-400 mt-1">{staffAnalytics.leaves} Days</span>
                        <span className="text-[9px] text-muted-foreground/80 mt-1 font-semibold">Excused time off</span>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Absences</span>
                        <span className="text-3xl font-black text-rose-500 mt-1">{staffAnalytics.absent} Days</span>
                        <span className="text-[9px] text-muted-foreground/80 mt-1 font-semibold">Unexcused days off</span>
                      </CardContent>
                    </Card>
                    <Card className="glass-card border-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hours & Overtime</span>
                        <span className="text-2xl font-black text-pink-500 mt-1">{staffAnalytics.hours}h <span className="text-xs text-muted-foreground">({staffAnalytics.overtime}h OT)</span></span>
                        <span className="text-[9px] text-muted-foreground/80 mt-1 font-semibold">Cumulative tracked time</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Attendance Log Table */}
                  <Card className="glass-card border-none overflow-hidden">
                    <CardHeader className="py-4 border-b border-white/5">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <History className="size-4 text-pink-500" /> Chronological Shift History ({staffHistory.length} logs)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[350px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/5">
                            <TableHead className="font-bold py-3 pl-6">Date</TableHead>
                            <TableHead className="font-bold py-3 text-center">Status</TableHead>
                            <TableHead className="font-bold py-3">Clock In</TableHead>
                            <TableHead className="font-bold py-3">Clock Out</TableHead>
                            <TableHead className="font-bold py-3">Working Hours</TableHead>
                            <TableHead className="font-bold py-3">Overtime</TableHead>
                            <TableHead className="font-bold py-3 text-right pr-6">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staffHistory.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs font-semibold">
                                No roster history records found for selected period.
                              </TableCell>
                            </TableRow>
                          ) : (
                            staffHistory.map(h => (
                              <TableRow key={h.id} className="border-white/5 hover:bg-muted/10">
                                <TableCell className="py-3 pl-6 font-bold text-xs text-foreground">
                                  {format(new Date(h.date + "T00:00:00"), "PPP")}
                                </TableCell>
                                <TableCell className="py-3 text-center">
                                  {getStatusBadge(h.status)}
                                </TableCell>
                                <TableCell className="py-3 text-xs text-muted-foreground">
                                  {["Full Day", "Half Day", "active_shift", "present", "half_day", "late"].includes(h.status) ? (
                                    <span>{formatClockTime(h.clock_in)}</span>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-3 text-xs text-muted-foreground">
                                  {["Full Day", "Half Day", "present", "half_day", "late"].includes(h.status) ? (
                                    <span>{formatClockTime(h.clock_out)}</span>
                                  ) : h.status === "active_shift" ? (
                                    <span className="text-blue-400 font-semibold animate-pulse">Active Shift</span>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-3 text-xs text-muted-foreground font-bold text-indigo-400">
                                  {["Full Day", "Half Day", "present", "half_day", "late"].includes(h.status) ? (
                                    <span>{h.working_hours}h</span>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-3 text-xs text-muted-foreground font-bold text-pink-400">
                                  {["Full Day", "Half Day", "present", "half_day", "late"].includes(h.status) && h.overtime_hours > 0 ? (
                                    <span>+{h.overtime_hours}h</span>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-3 text-right pr-6">
                                  <div className="flex justify-end items-center gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground"
                                      title="Edit Record"
                                      onClick={() => {
                                        const currentStaff = staff.find(s => s.id === selectedStaffId)
                                        handleOpenEditRecord(currentStaff, h)
                                      }}
                                    >
                                      <Edit2 className="size-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 rounded-lg hover:bg-rose-500/20 text-rose-500"
                                      title="Delete Record"
                                      onClick={() => handleOpenDeleteAttendance(h)}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
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
                  <SelectTrigger className="w-40 rounded-xl bg-background/50 border-white/10 font-bold h-10">
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
                className="rounded-xl border border-white/10 font-bold px-6 h-10 gap-2 hover:bg-muted/30 text-xs"
                onClick={() => {
                  toast.promise(
                    generateAttendanceReport(reportRange, customStart, customEnd),
                    {
                      loading: "Generating PDF report...",
                      success: "Attendance report downloaded successfully!",
                      error: "Failed to generate report",
                    }
                  )
                }}
              >
                <FileText className="size-4 text-rose-500" /> Download PDF Report
              </Button>
            </div>

            {/* Report Table */}
            <Card className="glass-card border-none overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-white/10">
                      <TableHead className="font-bold py-4 pl-6">Staff Member</TableHead>
                      <TableHead className="font-bold py-4">Role & Department</TableHead>
                      <TableHead className="font-bold py-4 text-center">Tracked Logs</TableHead>
                      <TableHead className="font-bold py-4 text-center">Present / Absent</TableHead>
                      <TableHead className="font-bold py-4 text-center">Hours / Overtime</TableHead>
                      <TableHead className="font-bold py-4 text-right pr-6">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                          No roster logs found for the selected date range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.map(r => (
                        <TableRow key={r.id} className="border-white/10 hover:bg-muted/10">
                          {/* Staff Name & ID */}
                          <TableCell className="py-4 pl-6 font-bold flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-pink-500/10 text-pink-600 font-bold flex items-center justify-center text-xs">
                              {r.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-foreground text-sm font-bold">{r.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono font-medium">{r.employee_id}</div>
                            </div>
                          </TableCell>

                          {/* Role & Dept */}
                          <TableCell className="font-semibold text-sm">
                            <div>{r.department || "Front Office"}</div>
                            <div className="text-[11px] text-muted-foreground font-medium">{r.designation || r.role}</div>
                          </TableCell>

                          {/* Total Days */}
                          <TableCell className="font-bold text-center text-sm text-muted-foreground">{r.totalDays} Days</TableCell>

                          {/* Present/Absent */}
                          <TableCell className="font-bold text-center text-sm">
                            <span className="text-emerald-500">{r.presentDays}P</span>
                            <span className="text-muted-foreground/60 mx-1.5">/</span>
                            <span className="text-rose-500">{r.absentDays}A</span>
                            {r.leaveDays > 0 && <span className="text-sky-400 text-xs ml-1.5">({r.leaveDays}L)</span>}
                          </TableCell>

                          {/* Hours / Overtime */}
                          <TableCell className="font-bold text-center text-sm text-indigo-400">
                            <span>{Math.round(r.totalHours * 10) / 10}h</span>
                            {r.totalOvertime > 0 && (
                              <span className="text-[11px] text-pink-500 ml-1.5">(+{Math.round(r.totalOvertime * 10) / 10}h)</span>
                            )}
                          </TableCell>

                          {/* Rate % */}
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
        <DialogContent className="sm:max-w-[450px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-black bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">Register Staff Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="staffEmpId" className="font-bold text-xs">Employee ID *</Label>
                <Input
                  id="staffEmpId"
                  placeholder="e.g. EMP-101"
                  value={newStaffEmpId}
                  onChange={e => setNewStaffEmpId(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffName" className="font-bold text-xs">Full Name *</Label>
                <Input
                  id="staffName"
                  placeholder="e.g. Ramesh Kumar"
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="staffRole" className="font-bold text-xs">Primary Role *</Label>
                <Input
                  id="staffRole"
                  placeholder="e.g. Receptionist"
                  value={newStaffRole}
                  onChange={e => setNewStaffRole(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffDesignation" className="font-bold text-xs">Designation / Title</Label>
                <Input
                  id="staffDesignation"
                  placeholder="e.g. Junior Receptionist"
                  value={newStaffDesignation}
                  onChange={e => setNewStaffDesignation(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="staffDept" className="font-bold text-xs">Department</Label>
                <Input
                  id="staffDept"
                  placeholder="e.g. Front Office"
                  value={newStaffDept}
                  onChange={e => setNewStaffDept(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffPhone" className="font-bold text-xs">Contact Phone</Label>
                <Input
                  id="staffPhone"
                  placeholder="+91 9000100010"
                  value={newStaffPhone}
                  onChange={e => setNewStaffPhone(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full rounded-xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 text-white" disabled={addingStaff}>
                {addingStaff && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Registration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT STAFF PROFILE DIALOG */}
      <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
        <DialogContent className="sm:max-w-[450px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-black bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">Edit Staff Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStaff} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editStaffEmpId" className="font-bold text-xs">Employee ID *</Label>
                <Input
                  id="editStaffEmpId"
                  value={editStaffEmpId}
                  onChange={e => setEditStaffEmpId(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editStaffName" className="font-bold text-xs">Full Name *</Label>
                <Input
                  id="editStaffName"
                  value={editStaffName}
                  onChange={e => setEditStaffName(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editStaffRole" className="font-bold text-xs">Primary Role *</Label>
                <Input
                  id="editStaffRole"
                  value={editStaffRole}
                  onChange={e => setEditStaffRole(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editStaffDesignation" className="font-bold text-xs">Designation / Title</Label>
                <Input
                  id="editStaffDesignation"
                  value={editStaffDesignation}
                  onChange={e => setEditStaffDesignation(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editStaffDept" className="font-bold text-xs">Department</Label>
                <Input
                  id="editStaffDept"
                  value={editStaffDept}
                  onChange={e => setEditStaffDept(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editStaffPhone" className="font-bold text-xs">Contact Phone</Label>
                <Input
                  id="editStaffPhone"
                  value={editStaffPhone}
                  onChange={e => setEditStaffPhone(e.target.value)}
                  className="rounded-xl border-white/10 bg-muted/20"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="rounded-xl flex-1 font-bold text-foreground border-white/10" onClick={() => setIsEditStaffOpen(false)}>
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
            <DialogTitle className="text-xl font-bold text-rose-500 flex items-center gap-2">
              <ShieldAlert className="size-5" /> Delete Staff Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this staff member? This will permanently delete their profile and all their associated attendance history logs. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="pt-4 flex gap-2">
            <Button variant="outline" className="rounded-xl flex-1 font-bold text-foreground border-white/10" onClick={() => setIsDeleteStaffOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDeleteStaff} disabled={deletingStaff}>
              {deletingStaff && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLOCK OUT DIALOG */}
      <Dialog open={isClockOutOpen} onOpenChange={setIsClockOutOpen}>
        <DialogContent className="sm:max-w-[420px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-black bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">Clock Out Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmClockOut} className="space-y-4 pt-2">
            <div className="text-xs font-semibold text-muted-foreground bg-muted/10 border border-white/5 p-3 rounded-xl space-y-1">
              <div>Staff Member: <span className="font-bold text-foreground">{clockOutStaff?.name}</span></div>
              <div>Employee ID: <span className="font-bold text-foreground">{clockOutStaff?.employee_id}</span></div>
              <div>Clock-In Time: <span className="font-bold text-foreground">{formatClockTime(clockInTimeVal)}</span></div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clockOutTime" className="font-bold text-xs">Clock Out Datetime *</Label>
              <Input
                id="clockOutTime"
                type="datetime-local"
                value={clockOutTimeVal}
                onChange={e => setClockOutTimeVal(e.target.value)}
                className="rounded-xl border-white/10 bg-muted/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/10 border border-white/5 p-3 rounded-xl text-[11px] font-semibold text-muted-foreground">
              <div className="space-y-1">
                <div>Duration: <span className="font-bold text-foreground">{clockOutDuration}h</span></div>
                <div>Working Hours: <span className="font-bold text-foreground">{clockOutWorkingHours}h</span></div>
                <div>Overtime: <span className="font-bold text-foreground">{clockOutOvertime > 0 ? `+${clockOutOvertime}h` : "0h"}</span></div>
              </div>
              <div className="space-y-1 text-right">
                <div>Late Arrival: <span className={cn("font-bold", clockOutLateArrival ? "text-amber-500" : "text-emerald-500")}>{clockOutLateArrival ? "Yes" : "No"}</span></div>
                <div>Early Departure: <span className={cn("font-bold", clockOutEarlyDeparture ? "text-amber-500" : "text-emerald-500")}>{clockOutEarlyDeparture ? "Yes" : "No"}</span></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clockOutStatus" className="font-bold text-xs">Attendance Status Override</Label>
              <Select value={clockOutStatus} onValueChange={(val: any) => setClockOutStatus(val)}>
                <SelectTrigger id="clockOutStatus" className="rounded-xl bg-background/50 border-white/10 font-semibold text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present" className="text-xs font-semibold text-emerald-500">Full Day</SelectItem>
                  <SelectItem value="half_day" className="text-xs font-semibold text-orange-500">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clockOutRemarks" className="font-bold text-xs">Remarks / Shift Logs</Label>
              <textarea
                id="clockOutRemarks"
                placeholder="Optionally log notes for this shift..."
                value={clockOutRemarks}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setClockOutRemarks(e.target.value)}
                className="flex min-h-[60px] w-full rounded-xl border border-white/10 bg-muted/20 px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white" disabled={submittingClockOut}>
                {submittingClockOut && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Clock Out Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADMIN MANUAL OVERRIDE DIALOG */}
      <Dialog open={isEditRecordOpen} onOpenChange={setIsEditRecordOpen}>
        <DialogContent className="sm:max-w-[420px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-black bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">Edit Attendance Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRecordEdit} className="space-y-4 pt-2">
            <div className="text-xs font-semibold text-muted-foreground bg-muted/10 border border-white/5 p-3 rounded-xl space-y-1">
              <div>Staff Member: <span className="font-bold text-foreground">{editRecordStaff?.name}</span></div>
              <div>Roster Date: <span className="font-bold text-foreground">{editRecordAttendance ? format(new Date(editRecordAttendance.date + "T00:00:00"), "PPP") : ""}</span></div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editRecordStatus" className="font-bold text-xs">Roster Status</Label>
              <Select value={editRecordStatus} onValueChange={(val: any) => setEditRecordStatus(val)}>
                <SelectTrigger id="editRecordStatus" className="rounded-xl bg-background/50 border-white/10 font-semibold text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active_shift" className="text-xs text-blue-400">Active Shift (Clocked In)</SelectItem>
                  <SelectItem value="present" className="text-xs text-emerald-500">Full Day</SelectItem>
                  <SelectItem value="half_day" className="text-xs text-orange-500">Half Day</SelectItem>
                  <SelectItem value="absent" className="text-xs text-rose-500">Absent</SelectItem>
                  <SelectItem value="on_leave" className="text-xs text-sky-500">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {["present", "half_day", "active_shift"].includes(editRecordStatus) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="editClockIn" className="font-bold text-xs">Clock-In Time</Label>
                    <Input
                      id="editClockIn"
                      type="datetime-local"
                      value={editRecordClockIn}
                      onChange={e => setEditRecordClockIn(e.target.value)}
                      className="rounded-xl border-white/10 bg-muted/20 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editClockOut" className="font-bold text-xs">Clock-Out Time</Label>
                    <Input
                      id="editClockOut"
                      type="datetime-local"
                      value={editRecordClockOut}
                      onChange={e => setEditRecordClockOut(e.target.value)}
                      className="rounded-xl border-white/10 bg-muted/20 text-xs"
                      disabled={editRecordStatus === "active_shift"}
                      required={editRecordStatus !== "active_shift"}
                    />
                  </div>
                </div>

                {editRecordStatus !== "active_shift" && (
                  <div className="grid grid-cols-2 gap-4 bg-muted/10 border border-white/5 p-3 rounded-xl text-[11px] font-semibold text-muted-foreground">
                    <div className="space-y-1">
                      <div>Duration: <span className="font-bold text-foreground">{editRecordDuration}h</span></div>
                      <div>Working Hours: <span className="font-bold text-foreground">{editRecordWorkingHours}h</span></div>
                      <div>Overtime: <span className="font-bold text-foreground">{editRecordOvertime > 0 ? `+${editRecordOvertime}h` : "0h"}</span></div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div>Late Arrival: <span className={cn("font-bold", editRecordLateArrival ? "text-amber-500" : "text-emerald-500")}>{editRecordLateArrival ? "Yes" : "No"}</span></div>
                      <div>Early Departure: <span className={cn("font-bold", editRecordEarlyDeparture ? "text-amber-500" : "text-emerald-500")}>{editRecordEarlyDeparture ? "Yes" : "No"}</span></div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="editRecordRemarks" className="font-bold text-xs">Audit Override Reason *</Label>
              <textarea
                id="editRecordRemarks"
                placeholder="Describe why you are overriding this attendance record..."
                value={editRecordRemarks}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditRecordRemarks(e.target.value)}
                className="flex min-h-[60px] w-full rounded-xl border border-white/10 bg-muted/20 px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                required
              />
            </div>

            <DialogFooter className="pt-2 flex gap-2">
              <Button type="button" variant="outline" className="rounded-xl flex-1 font-bold text-foreground border-white/10" onClick={() => setIsEditRecordOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl flex-1 font-bold bg-pink-600 hover:bg-pink-700 text-white" disabled={submittingRecordEdit}>
                {submittingRecordEdit && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Override
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE ATTENDANCE RECORD CONFIRMATION DIALOG */}
      <Dialog open={isDeleteAttendanceOpen} onOpenChange={setIsDeleteAttendanceOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-500 flex items-center gap-2">
              <ShieldAlert className="size-5" /> Delete Roster Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedAttendanceRecord && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete the attendance log record on <span className="font-bold text-foreground">{format(new Date(selectedAttendanceRecord.date + "T00:00:00"), "PPP")}</span>? This will wipe the clocked hours for this shift.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="deleteRecordRemarks" className="font-bold text-xs text-muted-foreground">Reason for deletion *</Label>
              <Input
                id="deleteRecordRemarks"
                placeholder="Reason for deleting this record..."
                value={deleteRecordRemarks}
                onChange={e => setDeleteRecordRemarks(e.target.value)}
                className="rounded-xl border-white/10 bg-muted/20 text-xs h-9"
                required
              />
            </div>
          </div>
          <DialogFooter className="pt-4 flex gap-2">
            <Button variant="outline" className="rounded-xl flex-1 font-bold text-foreground border-white/10" onClick={() => setIsDeleteAttendanceOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="rounded-xl flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white" 
              onClick={handleDeleteAttendance} 
              disabled={deletingAttendance || !deleteRecordRemarks.trim()}
            >
              {deletingAttendance && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW AUDIT TRAIL DIALOG */}
      <Dialog open={isAuditTrailOpen} onOpenChange={setIsAuditTrailOpen}>
        <DialogContent className="sm:max-w-[800px] glass-card border-none text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
              <History className="size-5 text-indigo-400" /> Admin Attendance Audit Trail
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review history logs of manual overrides, clock-in, clock-out, and deletions.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 border border-white/5 rounded-xl overflow-hidden bg-muted/5">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="border-white/5">
                  <TableHead className="font-bold text-xs py-3 pl-4">Timestamp</TableHead>
                  <TableHead className="font-bold text-xs py-3">User (Modifier)</TableHead>
                  <TableHead className="font-bold text-xs py-3">Staff / Shift Date</TableHead>
                  <TableHead className="font-bold text-xs py-3 text-center">Action</TableHead>
                  <TableHead className="font-bold text-xs py-3">Roster Status Transition</TableHead>
                  <TableHead className="font-bold text-xs py-3 pr-4">Reason / Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAudit ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs font-semibold">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs font-semibold">
                      No audit trails recorded in the system yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map(log => {
                    const staffName = log.attendance?.staff?.name || "Deleted Staff"
                    const dateStr = log.attendance?.date 
                      ? format(new Date(log.attendance.date + "T00:00:00"), "MM/dd/yyyy")
                      : "N/A"
                    return (
                      <TableRow key={log.id} className="border-white/5 hover:bg-muted/10 text-xs">
                        <TableCell className="py-2.5 pl-4 text-muted-foreground font-mono text-[10px]">
                          {format(new Date(log.modified_at), "MM/dd HH:mm:ss")}
                        </TableCell>
                        <TableCell className="py-2.5 font-semibold text-muted-foreground max-w-[120px] truncate" title={log.modified_by}>
                          {log.modified_by}
                        </TableCell>
                        <TableCell className="py-2.5 font-bold">
                          <div>{staffName}</div>
                          <div className="text-[10px] text-muted-foreground font-medium font-mono">Date: {dateStr}</div>
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <span className={cn(
                            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold",
                            log.action === "CLOCK_IN" && "bg-emerald-500/10 text-emerald-400",
                            log.action === "CLOCK_OUT" && "bg-indigo-500/10 text-indigo-400",
                            log.action === "UPDATE" && "bg-amber-500/10 text-amber-400",
                            log.action === "DELETE" && "bg-rose-500/10 text-rose-400"
                          )}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-muted-foreground">
                          {log.action === "DELETE" ? (
                            <span className="text-[10px] text-rose-500/70 line-through">Status: {log.old_status}</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-[10px]">{log.old_status || "None"}</span>
                              <ArrowRight className="size-3 text-muted-foreground" />
                              <span className="font-bold text-[10px] text-foreground">{log.new_status}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 pr-4 text-muted-foreground max-w-[150px] truncate" title={log.remarks || ""}>
                          {log.remarks || "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" className="rounded-xl w-full border-white/10 font-bold" onClick={() => setIsAuditTrailOpen(false)}>
              Close Audit Trail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
