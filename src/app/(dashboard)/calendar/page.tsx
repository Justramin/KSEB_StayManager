"use client"

import { useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import "./calendar.css"

export default function CalendarPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    setLoading(true)
    try {
      // 1. Fetch Room Bookings
      const { data: roomBookings } = await supabase
        .from("bookings")
        .select("*, rooms(room_number)")
        .neq("status", "completed")

      // 2. Fetch Hall Bookings
      const { data: hallBookings } = await supabase
        .from("hall_bookings")
        .select("*")
        .neq("status", "cancelled")

      const roomEvents = (roomBookings || []).map(b => ({
        id: b.id,
        title: `Room ${b.rooms?.room_number}: ${b.customer_name}`,
        start: b.check_in_date,
        backgroundColor: "#ef4444", // Red
        borderColor: "#ef4444",
        extendedProps: { type: "room" }
      }))

      const hallEvents = (hallBookings || []).map(b => ({
        id: b.id,
        title: `Hall: ${b.customer_name} (${b.purpose || "Event"})`,
        start: `${b.event_date}T${b.start_time}`,
        end: `${b.event_date}T${b.end_time}`,
        backgroundColor: "#3b82f6", // Blue
        borderColor: "#3b82f6",
        extendedProps: { type: "hall" }
      }))

      setEvents([...roomEvents, ...hallEvents])
    } catch (error) {
      console.error("Error fetching calendar events:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Booking Calendar</h2>
        <p className="text-muted-foreground">
          Visualize all bookings and availability across rooms and halls.
        </p>
      </div>

      <Card className="border-none shadow-xl">
        <CardContent className="p-4 md:p-6">
          <div className="calendar-container">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,listMonth",
              }}
              events={events}
              height="auto"
              eventClick={(info) => {
                alert(`Event: ${info.event.title}`)
              }}
              dayMaxEvents={true}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-6 justify-center text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-500" />
          <span>Room Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>Hall Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>Available</span>
        </div>
      </div>
    </div>
  )
}
