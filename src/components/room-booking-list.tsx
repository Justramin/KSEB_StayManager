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
import { LogOut, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface RoomBookingListProps {
  searchQuery: string
  refreshTrigger: number
  onRefresh: () => void
}

export function RoomBookingList({ searchQuery, refreshTrigger, onRefresh }: RoomBookingListProps) {
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
        .from("bookings")
        .select("*, rooms(room_number, has_attached_bathroom)")
        .order("created_at", { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error: any) {
      toast.error("Failed to fetch bookings")
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout(bookingId: string, roomId: string) {
    setProcessingId(bookingId)
    try {
      // 1. Update booking status
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ 
          status: "completed",
          check_out_date: new Date().toISOString()
        })
        .eq("id", bookingId)

      if (bookingError) throw bookingError

      // 2. Update room status
      const { error: roomError } = await supabase
        .from("rooms")
        .update({ current_status: "available" })
        .eq("id", roomId)

      if (roomError) throw roomError

      toast.success("Checkout successful")
      onRefresh()
    } catch (error: any) {
      toast.error("Error during checkout: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const filteredBookings = bookings.filter((b) =>
    b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.rooms?.room_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Check-in</TableHead>
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
                  <div className="text-xs text-muted-foreground">{booking.phone_number || "No phone"}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">Room {booking.rooms?.room_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {booking.rooms?.has_attached_bathroom ? "Deluxe" : "Standard"}
                  </div>
                </TableCell>
                <TableCell>{format(new Date(booking.check_in_date), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Badge variant={booking.status === "active" ? "default" : "secondary"}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {booking.status === "active" && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() => handleCheckout(booking.id, booking.room_id)}
                      disabled={processingId === booking.id}
                    >
                      {processingId === booking.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="mr-2 h-4 w-4" /> Checkout
                        </>
                      )}
                    </Button>
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
