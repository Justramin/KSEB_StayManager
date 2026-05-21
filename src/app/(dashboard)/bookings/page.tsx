"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Search, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { RoomBookingList } from "@/components/room-booking-list"
import { HallBookingList } from "@/components/hall-booking-list"
import { RoomBookingDialog } from "@/components/room-booking-dialog"
import { HallBookingDialog } from "@/components/hall-booking-dialog"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { generateRoomReport, generateHallReport } from "@/lib/reports"

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState("rooms")
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false)
  const [isHallDialogOpen, setIsHallDialogOpen] = useState(false)
  const [editingRoomBooking, setEditingRoomBooking] = useState<any | null>(null)
  const [editingHallBooking, setEditingHallBooking] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1)

  const handleRoomDialogClose = (open: boolean) => {
    setIsRoomDialogOpen(open)
    if (!open) {
      setEditingRoomBooking(null)
    }
  }

  const handleHallDialogClose = (open: boolean) => {
    setIsHallDialogOpen(open)
    if (!open) {
      setEditingHallBooking(null)
    }
  }

  const handleEditRoomBooking = (booking: any) => {
    setEditingRoomBooking(booking)
    setIsRoomDialogOpen(true)
  }

  const handleEditHallBooking = (booking: any) => {
    setEditingHallBooking(booking)
    setIsHallDialogOpen(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Booking Management</h2>
          <p className="text-muted-foreground">
            Manage room and hall bookings efficiently.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => activeTab === "rooms" ? generateRoomReport() : generateHallReport()}>
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button onClick={() => {
            if (activeTab === "rooms") {
              setEditingRoomBooking(null)
              setIsRoomDialogOpen(true)
            } else {
              setEditingHallBooking(null)
              setIsHallDialogOpen(true)
            }
          }}>
            <Plus className="mr-2 h-4 w-4" /> New {activeTab === "rooms" ? "Room" : "Hall"} Booking
          </Button>
        </div>
      </div>

      <Tabs defaultValue="rooms" onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList>
            <TabsTrigger value="rooms">Room Bookings</TabsTrigger>
            <TabsTrigger value="halls">Hall Bookings</TabsTrigger>
          </TabsList>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={`Search ${activeTab}...`}
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="rooms" className="space-y-4">
          <RoomBookingList 
            searchQuery={searchQuery} 
            refreshTrigger={refreshTrigger} 
            onRefresh={handleRefresh} 
            onEdit={handleEditRoomBooking}
          />
        </TabsContent>
        
        <TabsContent value="halls" className="space-y-4">
          <HallBookingList 
            searchQuery={searchQuery} 
            refreshTrigger={refreshTrigger} 
            onRefresh={handleRefresh} 
            onEdit={handleEditHallBooking}
          />
        </TabsContent>
      </Tabs>

      <RoomBookingDialog 
        open={isRoomDialogOpen} 
        onOpenChange={handleRoomDialogClose} 
        onSuccess={handleRefresh} 
        editingBooking={editingRoomBooking}
      />
      <HallBookingDialog 
        open={isHallDialogOpen} 
        onOpenChange={handleHallDialogClose} 
        onSuccess={handleRefresh} 
        editingBooking={editingHallBooking}
      />
    </div>
  )
}
