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
import { CheckCircle, XCircle, Loader2, Pencil, Trash } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface HallBookingListProps {
  searchQuery: string
  refreshTrigger: number
  onRefresh: () => void
  onEdit: (booking: any) => void
}

export function HallBookingList({ searchQuery, refreshTrigger, onRefresh, onEdit }: HallBookingListProps) {
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

  async function executeDeleteBooking() {
    if (!confirmDeleteBooking) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from("hall_bookings")
        .delete()
        .eq("id", confirmDeleteBooking.id)

      if (error) throw error

      toast.success("Hall booking deleted successfully")
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
                  <div className="flex justify-end items-center gap-2">
                    {booking.status === "confirmed" && (
                      <>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => handleStatusUpdate(booking.id, "completed")}
                          disabled={processingId === booking.id}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-500/10"
                          onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                          disabled={processingId === booking.id}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
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
                Are you sure you want to delete the hall booking for <strong className="text-foreground">{confirmDeleteBooking.customer_name}</strong>?
                This action cannot be undone.
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
