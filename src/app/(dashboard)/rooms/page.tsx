"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Bed,
  ArrowUpDown,
  Filter,
  LogIn,
  LogOut,
  Sparkles,
  RefreshCw,
  BookmarkCheck,
  CheckCircle,
} from "lucide-react"
import { RoomDialog } from "@/components/room-dialog"
import { RoomBookingDialog } from "@/components/room-booking-dialog"
import { createClient } from "@/utils/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { format, differenceInCalendarDays } from "date-fns"

export default function RoomsPage() {
  const supabase = createClient()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // Quick Booking Dialog
  const [bookingRoomId, setBookingRoomId] = useState<string | undefined>(undefined)
  const [bookingInitialStatus, setBookingInitialStatus] = useState<"booked" | "checked_in">("booked")
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  
  // Checkout Modal State
  const [checkoutRoom, setCheckoutRoom] = useState<any>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null)
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false)
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)

  useEffect(() => {
    fetchRooms()

    const channel = supabase
      .channel('rooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchRooms())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchRooms())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchRooms() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .order("room_number", { ascending: true })
      setRooms(data || [])
    } catch (error) {
      console.error("Error fetching rooms:", error)
    } finally {
      setLoading(false)
    }
  }

  async function executeDeleteRoom() {
    if (!deletingRoomId) return

    try {
      const { error } = await supabase
        .from("rooms")
        .update({ is_active: false })
        .eq("id", deletingRoomId)

      if (error) throw error
      toast.success("Room deleted successfully")
      setDeletingRoomId(null)
      fetchRooms()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Handle Quick Check-In for currently BOOKED rooms
  async function handleCheckinBookedRoom(room: any) {
    try {
      // Find the active booking for this room
      const { data: bookingsData, error: fetchErr } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", room.id)
        .eq("status", "booked")
        .order("created_at", { ascending: false })

      if (fetchErr) throw fetchErr

      const activeBooking = bookingsData?.[0]
      if (!activeBooking) {
        toast.error("No active booking found for this room to check in.")
        return
      }

      // Update Booking status to checked_in
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({ status: "checked_in", check_in_date: new Date().toISOString() })
        .eq("id", activeBooking.id)

      if (bookingErr) throw bookingErr

      // Update Room status to checked_in
      const { error: roomErr } = await supabase
        .from("rooms")
        .update({ current_status: "checked_in" })
        .eq("id", room.id)

      if (roomErr) throw roomErr

      toast.success(`Checked in customer: ${activeBooking.customer_name} into Room ${room.room_number}`)
      fetchRooms()
    } catch (err: any) {
      toast.error("Error checking in: " + err.message)
    }
  }

  // Trigger Checkout Modal and fetch details
  async function triggerCheckoutDialog(room: any) {
    try {
      const { data: bookingsData, error: fetchErr } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", room.id)
        .eq("status", "checked_in")
        .order("created_at", { ascending: false })

      if (fetchErr) throw fetchErr

      const activeBooking = bookingsData?.[0]
      if (!activeBooking) {
        toast.error("No active checked-in booking found for this room.")
        return
      }

      setCheckoutRoom(room)
      setCheckoutBooking(activeBooking)
      setIsCheckoutDialogOpen(true)
    } catch (err: any) {
      toast.error("Error reading booking details: " + err.message)
    }
  }

  // Finalize Checkout and move to cleaning
  async function handleFinalizeCheckout() {
    if (!checkoutRoom || !checkoutBooking) return
    setProcessingCheckout(true)
    try {
      // 1. Update booking
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({
          status: "checked_out",
          check_out_date: new Date().toISOString()
        })
        .eq("id", checkoutBooking.id)

      if (bookingErr) throw bookingErr

      // 2. Update room status to cleaning
      const { error: roomErr } = await supabase
        .from("rooms")
        .update({ current_status: "cleaning" })
        .eq("id", checkoutRoom.id)

      if (roomErr) throw roomErr

      toast.success(`Checkout successful for Room ${checkoutRoom.room_number}. Status is now: CLEANING`)
      setIsCheckoutDialogOpen(false)
      fetchRooms()
    } catch (err: any) {
      toast.error("Error finalizing checkout: " + err.message)
    } finally {
      setProcessingCheckout(false)
    }
  }

  // Transition from CLEANING to AVAILABLE
  async function handleMarkRoomCleaned(room: any) {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ current_status: "available" })
        .eq("id", room.id)

      if (error) throw error
      toast.success(`Room ${room.room_number} is now clean and AVAILABLE.`)
      fetchRooms()
    } catch (err: any) {
      toast.error("Error updating status: " + err.message)
    }
  }

  // Transition from CHECKED_OUT to CLEANING
  async function handleMarkCleaning(room: any) {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ current_status: "cleaning" })
        .eq("id", room.id)

      if (error) throw error
      toast.success(`Room ${room.room_number} status changed to CLEANING.`)
      fetchRooms()
    } catch (err: any) {
      toast.error("Error updating status: " + err.message)
    }
  }

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || room.current_status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Status badge coloring
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
      booked: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
      checked_in: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
      checked_out: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
      cleaning: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400"
    }

    const dotMap: Record<string, string> = {
      available: "bg-emerald-500",
      booked: "bg-amber-500",
      checked_in: "bg-blue-500",
      checked_out: "bg-purple-500",
      cleaning: "bg-rose-500"
    }

    return (
      <Badge variant="outline" className={cn("rounded-lg px-2.5 py-1 font-bold capitalize transition-all", statusMap[status] || "")}>
        <div className={cn("size-1.5 rounded-full mr-2", dotMap[status] || "bg-slate-400")} />
        {status.replace("_", " ")}
      </Badge>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight">Hotel Room Management</h2>
          <p className="text-muted-foreground font-medium">
            Manage rooms, track cleaning status, and execute check-ins/check-outs.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="rounded-xl font-bold shadow-lg shadow-primary/25 h-11 px-6"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" /> Add New Room
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { title: "Total Rooms", count: rooms.length, color: "text-primary", filter: "all" },
          { title: "Available", count: rooms.filter(r => r.current_status === 'available').length, color: "text-emerald-500", filter: "available" },
          { title: "Booked", count: rooms.filter(r => r.current_status === 'booked').length, color: "text-amber-500", filter: "booked" },
          { title: "Checked In", count: rooms.filter(r => r.current_status === 'checked_in').length, color: "text-blue-500", filter: "checked_in" },
          { title: "Cleaning", count: rooms.filter(r => r.current_status === 'cleaning').length, color: "text-rose-500", filter: "cleaning" },
        ].map((c) => (
          <Card 
            key={c.title} 
            onClick={() => setStatusFilter(c.filter)}
            className={cn(
              "glass-card border-none cursor-pointer transition-all active:scale-[0.98]",
              statusFilter === c.filter ? "ring-2 ring-primary bg-primary/[0.02]" : ""
            )}
          >
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">{c.title}</span>
              <span className={cn("text-2xl font-extrabold mt-1", c.color)}>{c.count}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Filters and Room Table */}
      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 py-6 border-b border-white/10 dark:border-white/5">
          <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search room number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-muted/20 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl h-11 gap-2 font-bold px-4">
                  <Filter className="h-4 w-4" /> Filter Status: <span className="capitalize text-primary">{statusFilter}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-44">
                <DropdownMenuItem className="font-semibold cursor-pointer" onClick={() => setStatusFilter("all")}>All Rooms</DropdownMenuItem>
                <DropdownMenuItem className="font-semibold cursor-pointer" onClick={() => setStatusFilter("available")}>Available</DropdownMenuItem>
                <DropdownMenuItem className="font-semibold cursor-pointer" onClick={() => setStatusFilter("booked")}>Booked</DropdownMenuItem>
                <DropdownMenuItem className="font-semibold cursor-pointer" onClick={() => setStatusFilter("checked_in")}>Checked In</DropdownMenuItem>
                <DropdownMenuItem className="font-semibold cursor-pointer" onClick={() => setStatusFilter("checked_out")}>Checked Out</DropdownMenuItem>
                <DropdownMenuItem className="font-semibold cursor-pointer" onClick={() => setStatusFilter("cleaning")}>Cleaning</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" className="rounded-xl h-11 w-11" onClick={fetchRooms}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="w-[150px] font-bold py-4 px-6">Room</TableHead>
                <TableHead className="font-bold py-4">Type</TableHead>
                <TableHead className="font-bold py-4">Status</TableHead>
                <TableHead className="font-bold py-4 text-center">Business Actions</TableHead>
                <TableHead className="text-right font-bold py-4 px-6">Options</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary/60" />
                        <span>Loading hotel properties...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground font-medium">
                      No rooms found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRooms.map((room, index) => (
                    <motion.tr
                      key={room.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                      className="group border-white/10 hover:bg-primary/[0.02] transition-colors"
                    >
                      <TableCell className="font-bold py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {room.room_number.charAt(0)}
                          </div>
                          {room.room_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "rounded-lg px-2.5 py-1 font-bold capitalize",
                            room.has_attached_bathroom 
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {room.has_attached_bathroom ? "Deluxe Room (Attached Bath)" : "Standard Room"}
                        </Badge>
                      </TableCell>
                      {/* Price cell removed */}
                      <TableCell>
                        {getStatusBadge(room.current_status)}
                      </TableCell>
                      <TableCell className="text-center py-4">
                        {/* BUSINESS WORKFLOW ACTION SWITCH */}
                        {room.current_status === "available" && (
                          <div className="flex justify-center gap-2">
                            <Button 
                              size="sm" 
                              className="rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-xs px-3"
                              onClick={() => {
                                setBookingRoomId(room.id)
                                setBookingInitialStatus("checked_in")
                                setIsBookingDialogOpen(true)
                              }}
                            >
                              <LogIn className="size-3 mr-1" /> Quick Check-In
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="rounded-lg font-bold text-xs px-3"
                              onClick={() => {
                                setBookingRoomId(room.id)
                                setBookingInitialStatus("booked")
                                setIsBookingDialogOpen(true)
                              }}
                            >
                              <BookmarkCheck className="size-3 mr-1 text-amber-500" /> Book / Reserve
                            </Button>
                          </div>
                        )}
                        {room.current_status === "booked" && (
                          <Button 
                            size="sm" 
                            className="rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-xs px-4"
                            onClick={() => handleCheckinBookedRoom(room)}
                          >
                            <CheckCircle className="size-3 mr-1" /> Check-In Guest
                          </Button>
                        )}
                        {room.current_status === "checked_in" && (
                          <Button 
                            size="sm" 
                            className="rounded-lg font-bold bg-purple-600 hover:bg-purple-700 text-xs px-4"
                            onClick={() => triggerCheckoutDialog(room)}
                          >
                            <LogOut className="size-3 mr-1" /> Check-Out Room
                          </Button>
                        )}
                        {room.current_status === "checked_out" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="rounded-lg font-bold text-xs px-4 text-rose-500 hover:bg-rose-500/10 border-rose-500/20"
                            onClick={() => handleMarkCleaning(room)}
                          >
                            <RefreshCw className="size-3 mr-1 animate-spin" /> Send to Cleaning
                          </Button>
                        )}
                        {room.current_status === "cleaning" && (
                          <Button 
                            size="sm" 
                            className="rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-xs px-4"
                            onClick={() => handleMarkRoomCleaned(room)}
                          >
                            <CheckCircle className="size-3 mr-1" /> Mark Cleaned
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-5 px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/80">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-40">
                            <DropdownMenuItem 
                              className="font-semibold gap-2 cursor-pointer rounded-lg mx-1 my-1"
                              onClick={() => {
                                setEditingRoom(room)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit2 className="h-4 w-4 text-primary" /> Edit Properties
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive font-semibold gap-2 cursor-pointer rounded-lg mx-1 mb-1 focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => setDeletingRoomId(room.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Delete Room
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ADD & EDIT DIALOGS */}
      <RoomDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        onSuccess={fetchRooms} 
      />
      <RoomDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        room={editingRoom} 
        onSuccess={fetchRooms} 
      />

      {/* QUICK BOOKING & CHECK-IN DIALOG */}
      <RoomBookingDialog
        open={isBookingDialogOpen}
        onOpenChange={setIsBookingDialogOpen}
        onSuccess={fetchRooms}
        initialRoomId={bookingRoomId}
        initialStatus={bookingInitialStatus}
      />

      {/* CHECKOUT BILLING & SUMMARY DIALOG */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-[450px] glass-card border-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-purple-600">
              <Sparkles className="size-6 text-purple-500" />
              Confirm Check-Out
            </DialogTitle>
          </DialogHeader>
          
          {checkoutBooking && checkoutRoom && (
            <div className="space-y-4 py-4 text-sm">
              <div className="p-4 bg-muted/30 rounded-xl space-y-2 border border-white/5">
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Guest Name:</span>
                  <span className="font-bold">{checkoutBooking.customer_name}</span>
                </div>
                {checkoutBooking.phone_number && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">Phone Number:</span>
                    <span className="font-bold">{checkoutBooking.phone_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Room Assignment:</span>
                  <span className="font-bold">Room {checkoutRoom.room_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Stay Dates:</span>
                  <span className="font-semibold">
                    {format(new Date(checkoutBooking.check_in_date), "MMM d")} - Today ({format(new Date(), "MMM d")})
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground text-center font-medium">
                Are you sure you want to check out this guest? The room status will be updated to CLEANING.
              </p>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="rounded-xl font-bold flex-1"
              onClick={() => setIsCheckoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl font-bold flex-1 bg-purple-600 hover:bg-purple-700"
              onClick={handleFinalizeCheckout}
              disabled={processingCheckout}
            >
              {processingCheckout && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Process Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE ROOM CONFIRMATION DIALOG */}
      <Dialog open={deletingRoomId !== null} onOpenChange={(open) => !open && setDeletingRoomId(null)}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-500">Delete Hotel Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this room? This will permanently remove the room space from the system.
            </p>
          </div>
          <DialogFooter className="pt-4 flex gap-2">
            <Button variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setDeletingRoomId(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white" onClick={executeDeleteRoom}>
              Delete Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  )
}
