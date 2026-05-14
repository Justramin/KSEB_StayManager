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
})

interface RoomBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RoomBookingDialog({ open, onOpenChange, onSuccess }: RoomBookingDialogProps) {
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
    },
  })

  useEffect(() => {
    if (open) {
      fetchAvailableRooms()
    }
  }, [open])

  async function fetchAvailableRooms() {
    setFetchingRooms(true)
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("current_status", "available")
        .eq("is_active", true)
        .order("room_number", { ascending: true })

      if (error) throw error
      setRooms(data || [])
    } catch (error: any) {
      toast.error("Failed to fetch available rooms")
    } finally {
      setFetchingRooms(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      // 1. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert([{
          customer_name: values.customer_name,
          phone_number: values.phone_number,
          room_id: values.room_id,
          check_in_date: values.check_in_date.toISOString(),
          status: "active"
        }])
        .select()

      if (bookingError) throw bookingError

      // 2. Update room status
      const { error: roomError } = await supabase
        .from("rooms")
        .update({ current_status: "booked" })
        .eq("id", values.room_id)

      if (roomError) throw roomError

      toast.success("Booking created successfully")
      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error("Error creating booking: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Room Booking</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="room_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Room *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={fetchingRooms}>
                        <SelectValue placeholder={fetchingRooms ? "Loading rooms..." : "Select a room"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.room_number} ({room.has_attached_bathroom ? "Deluxe" : "Standard"})
                        </SelectItem>
                      ))}
                      {rooms.length === 0 && !fetchingRooms && (
                        <div className="p-2 text-sm text-center text-muted-foreground">No available rooms</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="check_in_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Check-in Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Booking
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
