"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"
import { format } from "date-fns"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface HallBookingListProps {
  searchQuery: string
  refreshTrigger: number
  onRefresh: () => void
}

export function HallBookingList({ searchQuery, refreshTrigger, onRefresh }: HallBookingListProps) {
  const supabase = createClient()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [refreshTrigger])

  async function fetchBookings() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("hall_bookings")
        .select("*")
        .order("event_date", { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error: any) {
      toast.error("Failed to fetch hall bookings")
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    setProcessingId(id)
    try {
      const { error } = await supabase
        .from("hall_bookings")
        .update({ status })
        .eq("id", id)

      if (error) throw error
      toast.success(`Booking ${status}`)
      onRefresh()
    } catch (error: any) {
      toast.error("Error updating status")
    } finally {
      setProcessingId(null)
    }
  }

  const filteredBookings = bookings.filter((b) =>
    b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.purpose?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Event Date</TableHead>
            <TableHead>Time Slot</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Loading bookings...
              </TableCell>
            </TableRow>
          ) : filteredBookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No bookings found.
              </TableCell>
            </TableRow>
          ) : (
            filteredBookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <div className="font-medium">{booking.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{booking.purpose || "No purpose"}</div>
                </TableCell>
                <TableCell>{format(new Date(booking.event_date), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                </TableCell>
                <TableCell>
                  <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {booking.status === "confirmed" && (
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-emerald-600"
                        onClick={() => handleStatusUpdate(booking.id, "completed")}
                        disabled={processingId === booking.id}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-rose-600"
                        onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                        disabled={processingId === booking.id}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
