import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from "date-fns"
import { createClient } from "@/utils/supabase/client"

export async function generateRoomReport() {
  const supabase = createClient()
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, rooms(room_number)")
    .order("created_at", { ascending: false })

  const doc = new jsPDF()
  const today = format(new Date(), "yyyy-MM-dd HH:mm")

  doc.setFontSize(20)
  doc.text("StayManager - Room Booking Report", 14, 22)
  doc.setFontSize(10)
  doc.text(`Generated on: ${today}`, 14, 30)

  const tableData = (bookings || []).map((b: any) => [
    b.customer_name,
    b.rooms?.room_number || "N/A",
    format(new Date(b.check_in_date), "MMM d, yyyy"),
    b.check_out_date ? format(new Date(b.check_out_date), "MMM d, yyyy") : "-",
    b.status
  ])

  autoTable(doc, {
    startY: 40,
    head: [["Customer", "Room", "Check-in", "Check-out", "Status"]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }
  })

  doc.save(`room_report_${format(new Date(), "yyyyMMdd")}.pdf`)
}

export async function generateHallReport() {
  const supabase = createClient()
  const { data: bookings } = await supabase
    .from("hall_bookings")
    .select("*")
    .order("event_date", { ascending: false })

  const doc = new jsPDF()
  const today = format(new Date(), "yyyy-MM-dd HH:mm")

  doc.setFontSize(20)
  doc.text("StayManager - Hall Booking Report", 14, 22)
  doc.setFontSize(10)
  doc.text(`Generated on: ${today}`, 14, 30)

  const tableData = (bookings || []).map((b: any) => [
    b.customer_name,
    format(new Date(b.event_date), "MMM d, yyyy"),
    `${b.start_time} - ${b.end_time}`,
    b.purpose || "-",
    b.status
  ])

  autoTable(doc, {
    startY: 40,
    head: [["Customer", "Date", "Time", "Purpose", "Status"]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }
  })

  doc.save(`hall_report_${format(new Date(), "yyyyMMdd")}.pdf`)
}

export async function generateDormReport() {
  const supabase = createClient()
  const { data: bookings } = await supabase
    .from("bed_bookings")
    .select("*, beds(*, dormitories(*))")
    .order("created_at", { ascending: false })

  const doc = new jsPDF()
  const today = format(new Date(), "yyyy-MM-dd HH:mm")

  doc.setFontSize(20)
  doc.text("StayManager - Dormitory Bed Booking Report", 14, 22)
  doc.setFontSize(10)
  doc.text(`Generated on: ${today}`, 14, 30)

  const tableData = (bookings || []).map((b: any) => [
    b.customer_name,
    b.beds?.dormitories?.name || "N/A",
    b.beds?.bed_number || "N/A",
    format(new Date(b.check_in_date), "MMM d, yyyy"),
    b.check_out_date ? format(new Date(b.check_out_date), "MMM d, yyyy") : "-",
    b.status
  ])

  autoTable(doc, {
    startY: 40,
    head: [["Customer", "Dormitory", "Bed", "Check-in", "Check-out", "Status"]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] } // Violet-500/Indigo for dorm
  })

  doc.save(`dorm_report_${format(new Date(), "yyyyMMdd")}.pdf`)
}

export async function generateAttendanceReport(
  range: 'weekly' | 'monthly' | 'yearly' | 'custom' | 'all' = 'monthly',
  customStart?: Date,
  customEnd?: Date
) {
  const supabase = createClient()
  
  // Get date bounds
  let start: Date
  let end: Date = new Date()

  if (range === "weekly") {
    start = startOfWeek(new Date())
    end = endOfWeek(new Date())
  } else if (range === "monthly") {
    start = startOfMonth(new Date())
    end = endOfMonth(new Date())
  } else if (range === "yearly") {
    start = new Date(new Date().getFullYear(), 0, 1)
    end = new Date(new Date().getFullYear(), 11, 31)
  } else if (range === "custom" && customStart && customEnd) {
    start = customStart
    end = customEnd
  } else {
    // 30 days
    start = subDays(new Date(), 30)
  }

  const startStr = start.toISOString().split("T")[0]
  const endStr = end.toISOString().split("T")[0]

  // Fetch staff
  const { data: staffList } = await supabase
    .from("staff")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true })

  // Fetch attendance for date range
  const { data: attendanceList } = await supabase
    .from("attendance")
    .select("*")
    .gte("date", startStr)
    .lte("date", endStr)

  const doc = new jsPDF()
  const today = format(new Date(), "yyyy-MM-dd HH:mm")

  doc.setFontSize(20)
  doc.text("StayManager - Staff Attendance Report", 14, 22)
  doc.setFontSize(10)
  doc.text(`Period: ${format(start, "MMM d, yyyy")} to ${format(end, "MMM d, yyyy")}  |  Generated on: ${today}`, 14, 30)

  const tableData = (staffList || []).map((s: any) => {
    const records = (attendanceList || []).filter((a: any) => a.staff_id === s.id)
    const total = records.length
    const present = records.filter((a: any) => a.status === "present").length
    const absent = records.filter((a: any) => a.status === "absent").length
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0

    return [
      s.name,
      s.role,
      `${total} Days`,
      `${present} Days`,
      `${absent} Days`,
      `${percentage}%`
    ]
  })

  autoTable(doc, {
    startY: 40,
    head: [["Staff Name", "Role", "Tracked Days", "Present", "Absent", "Attendance Rate"]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [236, 72, 153] } // Pink-500 for attendance
  })

  doc.save(`attendance_report_${range}_${format(new Date(), "yyyyMMdd")}.pdf`)
}

