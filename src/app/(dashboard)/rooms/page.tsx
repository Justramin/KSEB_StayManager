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
  Building2,
} from "lucide-react"
import { RoomDialog } from "@/components/room-dialog"
import { createClient } from "@/utils/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function RoomsPage() {
  const supabase = createClient()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    fetchRooms()
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

  async function deleteRoom(id: string) {
    if (!confirm("Are you sure you want to delete this room?")) return

    try {
      const { error } = await supabase
        .from("rooms")
        .update({ is_active: false })
        .eq("id", id)

      if (error) throw error
      toast.success("Room deleted successfully")
      fetchRooms()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredRooms = rooms.filter((room) =>
    room.room_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight">Room Management</h2>
          <p className="text-muted-foreground font-medium">Manage your properties, availability, and room types.</p>
        </div>
        <Button 
          className="rounded-xl font-bold shadow-lg shadow-primary/25 h-11 px-6"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="mr-2 h-5 w-5" /> Add New Room
        </Button>
        <RoomDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen} 
          onSuccess={fetchRooms} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              {rooms.filter(r => r.current_status === 'available').length}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Deluxe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-500">
              {rooms.filter(r => r.type === 'deluxe').length}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Standard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">
              {rooms.filter(r => r.type === 'standard').length}
            </div>
          </CardContent>
        </Card>
      </div>

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
            <Button variant="outline" size="icon" className="rounded-xl h-11 w-11">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl h-11 w-11">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="w-[150px] font-bold py-4 px-6">Room Number</TableHead>
                <TableHead className="font-bold py-4">Type</TableHead>
                <TableHead className="font-bold py-4">Amenities</TableHead>
                <TableHead className="font-bold py-4">Status</TableHead>
                <TableHead className="text-right font-bold py-4 px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                          <Plus className="h-8 w-8 text-primary/40" />
                        </motion.div>
                        <span>Loading rooms...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                      No rooms found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRooms.map((room, index) => (
                    <motion.tr
                      key={room.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
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
                            "rounded-lg px-3 py-1 font-bold capitalize",
                            room.type === "deluxe" 
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {room.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {room.attached_bathroom && (
                            <Badge variant="outline" className="rounded-lg bg-muted/30 border-none font-medium">Attached Bath</Badge>
                          )}
                          <Badge variant="outline" className="rounded-lg bg-muted/30 border-none font-medium">A/C</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "rounded-lg px-3 py-1 font-bold transition-all",
                            room.current_status === "available"
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 border-rose-500/20"
                          )}
                        >
                          <div className={cn("size-1.5 rounded-full mr-2", room.current_status === "available" ? "bg-emerald-500" : "bg-rose-500")} />
                          {room.current_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-5 px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/80">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-white/10 w-40">
                            <DropdownMenuItem 
                              className="font-semibold gap-2 cursor-pointer rounded-lg mx-1 my-1"
                              onClick={() => {
                                setEditingRoom(room)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit2 className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive font-semibold gap-2 cursor-pointer rounded-lg mx-1 mb-1 focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => deleteRoom(room.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Delete
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

      <RoomDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        room={editingRoom} 
        onSuccess={fetchRooms} 
      />
    </div>
  )
}
