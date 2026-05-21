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
import { LogOut, Loader2, LogIn, CheckCircle, Pencil, Trash } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface RoomBookingListProps {
  searchQuery: string
  refreshTrigger: number
  onRefresh: () => void
  onEdit: (booking: any) => void
}

export function RoomBookingList({ searchQuery, refreshTrigger, onRefresh, onEdit }: RoomBookingListProps) {
  const supabase = createClient()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [confirmDeleteBooking, setConfirmDeleteBooking] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  // Check in a reserved guest
  async function handleCheckin(bookingId: string, roomId: string) {
    setProcessingId(bookingId)
    try {
      // 1. Update booking status
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ 
          status: "checked_in",
          check_in_date: new Date().toISOString()
        })
        .eq("id", bookingId)

      if (bookingError) throw bookingError

      // 2. Update room status
      const { error: roomError } = await supabase
        .from("rooms")
        .update({ current_status: "checked_in" })
        .eq("id", roomId)

      if (roomError) throw roomError

      toast.success("Guest checked in successfully")
      onRefresh()
    } catch (error: any) {
      toast.error("Error during check-in: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  // Checkout a checked in guest
  async function handleCheckout(bookingId: string, roomId: string) {
    setProcessingId(bookingId)
    try {
      // 1. Update booking status
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ 
          status: "checked_out",
          check_out_date: new Date().toISOString()
        })
        .eq("id", bookingId)

      if (bookingError) throw bookingError

      // 2. Update room status to cleaning
      const { error: roomError } = await supabase
        .from("rooms")
        .update({ current_status: "cleaning" })
        .eq("id", roomId)

      if (roomError) throw roomError

      toast.success("Checkout successful. Room sent to cleaning.")
      onRefresh()
    } catch (error: any) {
      toast.error("Error during checkout: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  async function executeDeleteBooking() {
    if (!confirmDeleteBooking) return
    setDeleting(true)
    try {
      // 1. Delete booking in Supabase
      const { error: deleteError } = await supabase
        .from("bookings")
        .delete()
        .eq("id", confirmDeleteBooking.id)

      if (deleteError) throw deleteError

      // 2. Revert room status to available (if it was booked or checked_in)
      if (["booked", "checked_in"].includes(confirmDeleteBooking.status)) {
        const { error: roomError } = await supabase
          .from("rooms")
          .update({ current_status: "available" })
          .eq("id", confirmDeleteBooking.room_id)
        if (roomError) throw roomError
      }

      toast.success("Booking deleted successfully")
      setConfirmDeleteBooking(null)
      onRefresh()
    } catch (error: any) {
      toast.error("Failed to delete booking: " + error.message)
    } finally {
      setDeleting(false)
    }
  }

  const filteredBookings = bookings.filter((b) =>
    b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.rooms?.room_number && b.rooms.room_number.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      booked: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      active: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      checked_in: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      checked_out: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      completed: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      cleaning: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
    }
    return (
      <Badge variant="outline" className={cn("rounded-lg px-2.5 py-1 capitalize font-bold", map[status] || "")}>
        {status}
      </Badge>
    )
  }

  // Payment badge helper removed since financial tracking is disabled

  return (
    <div className="rounded-xl border border-white/10 dark:border-white/5 bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="border-white/10">
            <TableHead className="font-bold py-4 pl-6">Customer Details</TableHead>
            <TableHead className="font-bold py-4">Room Assignment</TableHead>
            <TableHead className="font-bold py-4">Check-in Date</TableHead>
            <TableHead className="font-bold py-4">Booking Status</TableHead>
            <TableHead className="text-right font-bold py-4 pr-6">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-28 text-center text-muted-foreground font-semibold">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading bookings...
                </div>
              </TableCell>
            </TableRow>
          ) : filteredBookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-28 text-center text-muted-foreground font-medium">
                No room bookings found.
              </TableCell>
            </TableRow>
          ) : (
            filteredBookings.map((booking) => (
              <TableRow key={booking.id} className="border-white/10 hover:bg-muted/20">
                <TableCell className="py-4 pl-6">
                  <div className="font-bold">{booking.customer_name}</div>
                  <div className="text-xs text-muted-foreground font-semibold">{booking.phone_number || "No phone number"}</div>
                </TableCell>
                <TableCell>
                  {booking.rooms ? (
                    <>
                      <div className="font-bold text-sm text-foreground">Room {booking.rooms?.room_number}</div>
                      <div className="text-xs text-muted-foreground font-semibold">
                        {booking.rooms?.has_attached_bathroom ? "Deluxe Room" : "Standard Room"}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-xs font-semibold">Unassigned</span>
                  )}
                </TableCell>
                {/* Billing cell removed */}
                <TableCell className="font-semibold text-sm">
                  {booking.check_in_date ? format(new Date(booking.check_in_date), "MMM d, yyyy") : "Not checked in"}
                </TableCell>
                <TableCell>
                  {getStatusBadge(booking.status)}
                </TableCell>
                <TableCell className="text-right py-4 pr-6">
                  <div className="flex items-center justify-end gap-2">
                    {booking.status === "booked" && (
                      <Button 
                        size="sm" 
                        className="rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-xs h-8 px-3"
                        onClick={() => handleCheckin(booking.id, booking.room_id)}
                        disabled={processingId === booking.id}
                      >
                        {processingId === booking.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <LogIn className="mr-1 h-3.5 w-3.5" /> Check-In
                          </>
                        )}
                      </Button>
                    )}
                    {["active", "checked_in"].includes(booking.status) && (
                      <Button 
                        size="sm" 
                        className="rounded-lg font-bold bg-purple-600 hover:bg-purple-700 text-xs h-8 px-3 text-white border-none"
                        onClick={() => handleCheckout(booking.id, booking.room_id)}
                        disabled={processingId === booking.id}
                      >
                        {processingId === booking.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <LogOut className="mr-1 h-3.5 w-3.5" /> Checkout
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg hover:bg-muted"
                      onClick={() => onEdit(booking)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                      onClick={() => setConfirmDeleteBooking(booking)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {confirmDeleteBooking && (
        <Dialog open={!!confirmDeleteBooking} onOpenChange={(open) => !open && setConfirmDeleteBooking(null)}>
          <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-500">
                Confirm Deletion
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2">
                Are you sure you want to delete the booking for <strong className="text-foreground">{confirmDeleteBooking.customer_name}</strong>?
                This will delete the booking record, and the room status will be reset to available. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => setConfirmDeleteBooking(null)}
                className="rounded-xl border border-white/10 hover:bg-muted"
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={executeDeleteBooking}
                className="rounded-xl bg-red-600 hover:bg-red-700 font-bold"
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
