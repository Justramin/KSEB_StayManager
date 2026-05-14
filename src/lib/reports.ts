import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
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

  const tableData = (bookings || []).map(b => [
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

  const tableData = (bookings || []).map(b => [
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
