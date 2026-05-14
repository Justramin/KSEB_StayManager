"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

const formSchema = z.object({
  room_number: z.string().min(1, "Room number is required"),
  has_attached_bathroom: z.boolean(),
})

interface RoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room?: any
  onSuccess: () => void
}

export function RoomDialog({ open, onOpenChange, room, onSuccess }: RoomDialogProps) {
  const supabase = createClient()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      room_number: "",
      has_attached_bathroom: false,
    },
  })

  useEffect(() => {
    if (room) {
      form.reset({
        room_number: room.room_number,
        has_attached_bathroom: room.has_attached_bathroom,
      })
    } else {
      form.reset({
        room_number: "",
        has_attached_bathroom: false,
      })
    }
  }, [room, form, open])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (room) {
        const { error } = await supabase
          .from("rooms")
          .update(values)
          .eq("id", room.id)
        if (error) throw error
        toast.success("Room updated successfully")
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert([values])
        if (error) throw error
        toast.success("Room added successfully")
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error("Error saving room: " + error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{room ? "Edit Room" : "Add New Room"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="room_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 101, A1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="has_attached_bathroom"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Attached Bathroom</FormLabel>
                    <FormDescription>
                      Check this if the room has an attached bathroom (Deluxe).
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="w-full">
                {room ? "Update Room" : "Create Room"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
