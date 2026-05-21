"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

const formSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  phone_number: z.string().optional(),
  room_id: z.string().min(1, "Please select a room"),
  check_in_date: z.date({
    message: "Check-in date is required",
  }),
  booking_type: z.enum(["booked", "checked_in", "checked_out", "cancelled"]),
})

interface RoomBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialRoomId?: string
  initialStatus?: "booked" | "checked_in"
  editingBooking?: any
}

export function RoomBookingDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  initialRoomId,
  initialStatus = "booked",
  editingBooking
}: RoomBookingDialogProps) {
  const supabase = createClient()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingRooms, setFetchingRooms] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: "",
      phone_number: "",
      room_id: "",
      check_in_date: new Date(),
      booking_type: "booked",
    },
  })

  // Watch room_id changes if needed, but not required since pricing is removed

  useEffect(() => {
    if (open) {
      fetchAvailableRooms()
    }
  }, [open, initialRoomId, editingBooking])

  useEffect(() => {
    if (open) {
      if (editingBooking) {
        form.reset({
          customer_name: editingBooking.customer_name || "",
          phone_number: editingBooking.phone_number || "",
          room_id: editingBooking.room_id || "",
          check_in_date: editingBooking.check_in_date ? new Date(editingBooking.check_in_date) : new Date(),
          booking_type: editingBooking.status || "booked",
        })
      } else {
        form.reset({
          customer_name: "",
          phone_number: "",
          room_id: initialRoomId || "",
          check_in_date: new Date(),
          booking_type: initialStatus,
        })
      }
    }
  }, [open, initialRoomId, initialStatus, editingBooking, form])

  async function fetchAvailableRooms() {
    setFetchingRooms(true)
    try {
      // Fetch all active rooms
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .order("room_number", { ascending: true })

      if (error) throw error
      
      const currentRoomId = editingBooking?.room_id || initialRoomId
      
      // Filter the rest to "available" but always keep the current room choice if editing/pre-selected
      const filtered = (data || []).filter(
        (r: any) => r.current_status === "available" || r.id === currentRoomId
      )
      setRooms(filtered)
    } catch (error: any) {
      toast.error("Failed to fetch rooms")
    } finally {
      setFetchingRooms(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      if (editingBooking) {
        const oldRoomId = editingBooking.room_id
        const newRoomId = values.room_id
        const oldStatus = editingBooking.status
        const newStatus = values.booking_type

        // 1. Update booking
        const { error: bookingError } = await supabase
          .from("bookings")
          .update({
            customer_name: values.customer_name,
            phone_number: values.phone_number,
            room_id: newRoomId,
            check_in_date: values.check_in_date.toISOString(),
            status: newStatus,
          })
          .eq("id", editingBooking.id)

        if (bookingError) throw bookingError

        // 2. Handle room status transitions
        if (oldRoomId !== newRoomId) {
          // Revert old room status to available
          const { error: oldRoomError } = await supabase
            .from("rooms")
            .update({ current_status: "available" })
            .eq("id", oldRoomId)
          if (oldRoomError) throw oldRoomError

          // Update new room status
          let roomStatus = "available"
          if (newStatus === "booked" || newStatus === "checked_in") {
            roomStatus = newStatus
          } else if (newStatus === "checked_out") {
            roomStatus = "cleaning"
          }
          const { error: newRoomError } = await supabase
            .from("rooms")
            .update({ current_status: roomStatus })
            .eq("id", newRoomId)
          if (newRoomError) throw newRoomError
        } else {
          // Room did not change, but status might have changed
          if (oldStatus !== newStatus) {
            let roomStatus = "available"
            if (newStatus === "booked" || newStatus === "checked_in") {
              roomStatus = newStatus
            } else if (newStatus === "checked_out") {
              roomStatus = "cleaning"
            }
            const { error: roomError } = await supabase
              .from("rooms")
              .update({ current_status: roomStatus })
              .eq("id", newRoomId)
            if (roomError) throw roomError
          }
        }

        toast.success("Booking updated successfully")
      } else {
        // Create mode
        // 1. Create booking
        const { error: bookingError } = await supabase
          .from("bookings")
          .insert([{
            customer_name: values.customer_name,
            phone_number: values.phone_number,
            room_id: values.room_id,
            check_in_date: values.check_in_date.toISOString(),
            status: values.booking_type,
          }])

        if (bookingError) throw bookingError

        // 2. Update room status based on booking type
        const nextRoomStatus = values.booking_type === "checked_in" ? "checked_in" : "booked"
        const { error: roomError } = await supabase
          .from("rooms")
          .update({ current_status: nextRoomStatus })
          .eq("id", values.room_id)

        if (roomError) throw roomError

        toast.success(values.booking_type === "checked_in" ? "Check-in successful" : "Room booked successfully")
      }

      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error("Error processing request: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] glass-card border-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingBooking 
              ? "Edit Room Booking" 
              : initialStatus === "checked_in" 
                ? "Quick Room Check-In" 
                : "New Room Booking"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 9876543210" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="room_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Select Room *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!initialRoomId || fetchingRooms}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={fetchingRooms ? "Loading..." : "Select room"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            Room {room.room_number} ({room.has_attached_bathroom ? "Deluxe" : "Standard"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="booking_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Flow Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="booked">Booked (Reserved)</SelectItem>
                        <SelectItem value="checked_in">Checked In (Active)</SelectItem>
                        {editingBooking && (
                          <>
                            <SelectItem value="checked_out">Checked Out (Completed)</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="check_in_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="font-bold">Check-in Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal rounded-xl",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full rounded-xl font-bold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBooking ? "Save Changes" : "Confirm Booking & Check-in"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
