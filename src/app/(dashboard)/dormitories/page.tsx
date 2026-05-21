"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Grid,
  Sparkles,
  RefreshCw,
  LogOut,
  LogIn,
  Bed,
  CheckCircle,
  CalendarIcon,
  BookmarkCheck,
  User,
  Phone,
  Coins,
  Edit2,
  Trash2,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, differenceInCalendarDays } from "date-fns"

export default function DormitoriesPage() {
  const supabase = createClient()
  
  // Data states
  const [dormitories, setDormitories] = useState<any[]>([])
  const [selectedDormId, setSelectedDormId] = useState<string>("")
  const [beds, setBeds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Create Dormitory Dialog
  const [isCreateDormOpen, setIsCreateDormOpen] = useState(false)
  const [dormName, setDormName] = useState("")
  const [dormRows, setDormRows] = useState(4)
  const [dormCols, setDormCols] = useState(4)
  const [creatingDorm, setCreatingDorm] = useState(false)

  // Bed Booking Dialog
  const [selectedBedForBooking, setSelectedBedForBooking] = useState<any>(null)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [checkinDate, setCheckinDate] = useState<Date>(new Date())
  const [bookingType, setBookingType] = useState<"booked" | "checked_in">("booked")
  const [submittingBooking, setSubmittingBooking] = useState(false)

  // Bed Checkout Dialog
  const [selectedBedForCheckout, setSelectedBedForCheckout] = useState<any>(null)
  const [activeBedBooking, setActiveBedBooking] = useState<any>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [processingCheckout, setProcessingCheckout] = useState(false)

  // Selected Bed Details Panel (for side drawer or modal)
  const [focusedBed, setFocusedBed] = useState<any>(null)
  const [focusedBedBooking, setFocusedBedBooking] = useState<any>(null)

  // Edit Dormitory Dialog
  const [isEditDormOpen, setIsEditDormOpen] = useState(false)
  const [editDormName, setEditDormName] = useState("")
  const [updatingDorm, setUpdatingDorm] = useState(false)

  // Delete Dormitory Dialog
  const [isDeleteDormOpen, setIsDeleteDormOpen] = useState(false)
  const [deletingDorm, setDeletingDorm] = useState(false)

  // Add Bed Space Dialog
  const [isAddBedOpen, setIsAddBedOpen] = useState(false)
  const [newBedNumber, setNewBedNumber] = useState("")
  const [newBedRow, setNewBedRow] = useState(0)
  const [newBedCol, setNewBedCol] = useState(0)
  const [submittingBed, setSubmittingBed] = useState(false)

  // Edit Bed Space Dialog
  const [isEditBedOpen, setIsEditBedOpen] = useState(false)
  const [editBedNumber, setEditBedNumber] = useState("")
  const [editBedStatus, setEditBedStatus] = useState<"available" | "booked" | "checked_in" | "cleaning">("available")
  const [editBedRow, setEditBedRow] = useState(0)
  const [editBedCol, setEditBedCol] = useState(0)
  const [updatingBed, setUpdatingBed] = useState(false)

  // Delete Bed Space Dialog
  const [isDeleteBedOpen, setIsDeleteBedOpen] = useState(false)
  const [deletingBed, setDeletingBed] = useState(false)

  // Modify Layout Grid Dialog
  const [isModifyLayoutOpen, setIsModifyLayoutOpen] = useState(false)
  const [layoutRows, setLayoutRows] = useState(4)
  const [layoutCols, setLayoutCols] = useState(4)
  const [modifyingLayout, setModifyingLayout] = useState(false)

  useEffect(() => {
    fetchDormitories()
  }, [])

  useEffect(() => {
    if (selectedDormId) {
      fetchDormBeds(selectedDormId)
    }

    const channel = supabase
      .channel('dormitories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dormitories' }, () => fetchDormitories())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => {
        if (selectedDormId) fetchDormBeds(selectedDormId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bed_bookings' }, () => {
        if (selectedDormId) fetchDormBeds(selectedDormId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDormId])

  async function fetchDormitories() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("dormitories")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true })

      setDormitories(data || [])
      if (data && data.length > 0) {
        setSelectedDormId(data[0].id)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to load dormitories")
    } finally {
      setLoading(false)
    }
  }

  async function fetchDormBeds(dormId: string) {
    try {
      const { data } = await supabase
        .from("beds")
        .select("*")
        .eq("dormitory_id", dormId)
        .eq("is_active", true)
        .order("bed_number", { ascending: true })
      setBeds(data || [])
      
      // Clear focused bed when switching dorms
      setFocusedBed(null)
      setFocusedBedBooking(null)
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch beds for dormitory")
    }
  }

  // Update/Rename Dormitory
  async function handleUpdateDormitory(e: React.FormEvent) {
    e.preventDefault()
    if (!editDormName.trim() || !selectedDormId) return
    setUpdatingDorm(true)
    try {
      const { error } = await supabase
        .from("dormitories")
        .update({ name: editDormName })
        .eq("id", selectedDormId)

      if (error) throw error
      toast.success("Dormitory renamed successfully")
      setIsEditDormOpen(false)
      fetchDormitories()
    } catch (err: any) {
      toast.error("Failed to rename dormitory: " + err.message)
    } finally {
      setUpdatingDorm(false)
    }
  }

  // Delete Dormitory
  async function handleDeleteDormitory() {
    if (!selectedDormId) return
    setDeletingDorm(true)
    try {
      const { error } = await supabase
        .from("dormitories")
        .delete()
        .eq("id", selectedDormId)

      if (error) throw error
      toast.success("Dormitory deleted successfully")
      setIsDeleteDormOpen(false)
      setSelectedDormId("")
      setFocusedBed(null)
      setFocusedBedBooking(null)
      setBeds([])
      fetchDormitories()
    } catch (err: any) {
      toast.error("Failed to delete dormitory: " + err.message)
    } finally {
      setDeletingDorm(false)
    }
  }

  // Add Single Bed Space
  async function handleAddBed(e: React.FormEvent) {
    e.preventDefault()
    if (!newBedNumber.trim() || !selectedDormId) return
    setSubmittingBed(true)
    try {
      // Check if duplicate bed number exists in this dorm
      const { data: duplicate } = await supabase
        .from("beds")
        .select("id")
        .eq("dormitory_id", selectedDormId)
        .eq("bed_number", newBedNumber)
        .eq("is_active", true)

      if (duplicate && duplicate.length > 0) {
        toast.error("A bed with this number already exists in this dormitory.")
        setSubmittingBed(false)
        return
      }

      const { error } = await supabase
        .from("beds")
        .insert([{
          dormitory_id: selectedDormId,
          bed_number: newBedNumber,
          current_status: "available",
          row_index: newBedRow,
          col_index: newBedCol,
          is_active: true
        }])

      if (error) throw error
      toast.success(`Bed ${newBedNumber} added successfully`)
      setIsAddBedOpen(false)
      setNewBedNumber("")
      fetchDormBeds(selectedDormId)
    } catch (err: any) {
      toast.error("Failed to add bed space: " + err.message)
    } finally {
      setSubmittingBed(false)
    }
  }

  // Update Bed Space properties
  async function handleUpdateBed(e: React.FormEvent) {
    e.preventDefault()
    if (!editBedNumber.trim() || !focusedBed) return
    setUpdatingBed(true)
    try {
      const { error } = await supabase
        .from("beds")
        .update({
          bed_number: editBedNumber,
          current_status: editBedStatus,
          row_index: editBedRow,
          col_index: editBedCol
        })
        .eq("id", focusedBed.id)

      if (error) throw error
      toast.success("Bed space properties updated")
      setIsEditBedOpen(false)
      
      // Update focused bed properties
      setFocusedBed((prev: any) => ({
        ...prev,
        bed_number: editBedNumber,
        current_status: editBedStatus,
        row_index: editBedRow,
        col_index: editBedCol
      }))
      
      fetchDormBeds(selectedDormId)
    } catch (err: any) {
      toast.error("Failed to update bed: " + err.message)
    } finally {
      setUpdatingBed(false)
    }
  }

  // Delete Bed Space
  async function handleDeleteBed() {
    if (!focusedBed) return
    setDeletingBed(true)
    try {
      // Check if bed has active bookings (booked or checked_in)
      const { data: activeBookings, error: checkErr } = await supabase
        .from("bed_bookings")
        .select("id")
        .eq("bed_id", focusedBed.id)
        .in("status", ["booked", "checked_in"])

      if (checkErr) throw checkErr

      if (activeBookings && activeBookings.length > 0) {
        toast.error("Cannot delete a bed with active bookings or checked-in guests.")
        setDeletingBed(false)
        return
      }

      const { error } = await supabase
        .from("beds")
        .delete()
        .eq("id", focusedBed.id)

      if (error) throw error
      toast.success(`Bed ${focusedBed.bed_number} deleted successfully`)
      setIsDeleteBedOpen(false)
      setFocusedBed(null)
      setFocusedBedBooking(null)
      fetchDormBeds(selectedDormId)
    } catch (err: any) {
      toast.error("Failed to delete bed: " + err.message)
    } finally {
      setDeletingBed(false)
    }
  }

  // Modify Layout rows & columns
  async function handleModifyLayout(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDormId) return
    setModifyingLayout(true)
    try {
      // Fetch all current beds for this dormitory
      const { data: currentBeds, error: fetchErr } = await supabase
        .from("beds")
        .select("*")
        .eq("dormitory_id", selectedDormId)

      if (fetchErr) throw fetchErr
      const bedsList = currentBeds || []

      // Find beds that fall outside the new dimensions
      const obsoleteBeds = bedsList.filter(
        b => b.row_index >= layoutRows || b.col_index >= layoutCols
      )

      if (obsoleteBeds.length > 0) {
        // Check if any obsolete bed has active bookings
        const obsoleteBedIds = obsoleteBeds.map(b => b.id)
        const { data: activeBookings, error: bookingsErr } = await supabase
          .from("bed_bookings")
          .select("id, bed_id, beds(bed_number)")
          .in("bed_id", obsoleteBedIds)
          .in("status", ["booked", "checked_in"])

        if (bookingsErr) throw bookingsErr

        if (activeBookings && activeBookings.length > 0) {
          const bookedBedNumbers = activeBookings.map((ab: any) => ab.beds?.bed_number).filter(Boolean)
          toast.error(`Cannot resize grid. The following beds have active bookings: ${bookedBedNumbers.join(", ")}`)
          setModifyingLayout(false)
          return
        }

        // Delete obsolete beds
        const { error: deleteErr } = await supabase
          .from("beds")
          .delete()
          .in("id", obsoleteBedIds)

        if (deleteErr) throw deleteErr
      }

      // Generate new beds for empty grid slots
      const newBedsToCreate = []
      const currentDorm = dormitories.find(d => d.id === selectedDormId)
      const prefix = currentDorm?.name?.toLowerCase().includes("ladies") ? "L" : "G"

      for (let r = 0; r < layoutRows; r++) {
        for (let c = 0; c < layoutCols; c++) {
          // Check if there is already a bed at r, c
          const exists = bedsList.some(b => b.row_index === r && b.col_index === c)
          if (!exists) {
            const rowLetter = String.fromCharCode(65 + r)
            const bedNum = `${prefix}-${rowLetter}${c + 1}`
            newBedsToCreate.push({
              dormitory_id: selectedDormId,
              bed_number: bedNum,
              current_status: "available",
              row_index: r,
              col_index: c,
              is_active: true
            })
          }
        }
      }

      if (newBedsToCreate.length > 0) {
        const { error: insertErr } = await supabase.from("beds").insert(newBedsToCreate)
        if (insertErr) throw insertErr
      }

      toast.success(`Dormitory layout resized to ${layoutRows}x${layoutCols}`)
      setIsModifyLayoutOpen(false)
      fetchDormBeds(selectedDormId)
    } catch (err: any) {
      toast.error("Failed to modify layout: " + err.message)
    } finally {
      setModifyingLayout(false)
    }
  }

  // Create a new Dormitory and seed all its bed spaces
  async function handleCreateDormitory(e: React.FormEvent) {
    e.preventDefault()
    if (!dormName.trim()) return
    setCreatingDorm(true)
    try {
      // 1. Insert Dormitory
      const { data: newDorm, error: dormErr } = await supabase
        .from("dormitories")
        .insert([{ name: dormName, is_active: true }])
        .select()

      if (dormErr) throw dormErr
      const createdDorm = newDorm?.[0]
      if (!createdDorm) throw new Error("Creation failed")

      // 2. Generate Beds in bulk
      const newBeds: any[] = []
      const prefix = dormName.toLowerCase().includes("ladies") ? "L" : "G"
      
      for (let r = 0; r < dormRows; r++) {
        for (let c = 0; c < dormCols; c++) {
          const rowLetter = String.fromCharCode(65 + r) // A, B, C, D...
          const bedNum = `${prefix}-${rowLetter}${c + 1}`
          newBeds.push({
            dormitory_id: createdDorm.id,
            bed_number: bedNum,
            current_status: "available",
            row_index: r,
            col_index: c,
            is_active: true
          })
        }
      }

      const { error: bedErr } = await supabase.from("beds").insert(newBeds)
      if (bedErr) throw bedErr

      toast.success(`Dormitory "${dormName}" created with ${dormRows * dormCols} beds!`)
      setIsCreateDormOpen(false)
      setDormName("")
      
      // Refresh list
      const { data } = await supabase
        .from("dormitories")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true })
      
      setDormitories(data || [])
      setSelectedDormId(createdDorm.id)
    } catch (err: any) {
      toast.error("Error creating dormitory: " + err.message)
    } finally {
      setCreatingDorm(false)
    }
  }

  // Focus a bed and load its active booking details if any
  async function handleFocusBed(bed: any) {
    setFocusedBed(bed)
    setFocusedBedBooking(null)
    
    if (bed.current_status !== "available") {
      try {
        const { data } = await supabase
          .from("bed_bookings")
          .select("*")
          .eq("bed_id", bed.id)
          .in("status", ["booked", "checked_in"])
          .order("created_at", { ascending: false })

        if (data && data.length > 0) {
          setFocusedBedBooking(data[0])
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Check in a booked bed booking
  async function handleCheckinBedBooking(bed: any, booking: any) {
    try {
      // Update booking status
      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .update({ status: "checked_in", check_in_date: new Date().toISOString() })
        .eq("id", booking.id)

      if (bookingErr) throw bookingErr

      // Update Bed status
      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: "checked_in" })
        .eq("id", bed.id)

      if (bedErr) throw bedErr

      toast.success(`Checked in ${booking.customer_name} into Bed ${bed.bed_number}`)
      fetchDormBeds(selectedDormId)
    } catch (err: any) {
      toast.error("Check-in error: " + err.message)
    }
  }

  // Send to Cleaning
  async function handleSendToCleaning(bed: any) {
    try {
      const { error } = await supabase
        .from("beds")
        .update({ current_status: "cleaning" })
        .eq("id", bed.id)

      if (error) throw error
      toast.success(`Bed ${bed.bed_number} sent to cleaning.`)
      fetchDormBeds(selectedDormId)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Mark Cleaning Completed
  async function handleMarkCleaned(bed: any) {
    try {
      const { error } = await supabase
        .from("beds")
        .update({ current_status: "available" })
        .eq("id", bed.id)

      if (error) throw error
      toast.success(`Bed ${bed.bed_number} is clean and AVAILABLE.`)
      fetchDormBeds(selectedDormId)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Open Booking Dialog for available bed
  function triggerBedBooking(bed: any) {
    setSelectedBedForBooking(bed)
    setCustomerName("")
    setPhoneNumber("")
    setCheckinDate(new Date())
    setBookingType("booked")
    setIsBookingOpen(true)
  }

  // Submit Bed Booking
  async function handleSaveBedBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim() || !selectedBedForBooking) return
    setSubmittingBooking(true)
    try {
      // 1. Insert booking
      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .insert([{
          customer_name: customerName,
          phone_number: phoneNumber,
          bed_id: selectedBedForBooking.id,
          check_in_date: checkinDate.toISOString(),
          status: bookingType, // "booked" or "checked_in"
        }])

      if (bookingErr) throw bookingErr

      // 2. Update bed status
      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: bookingType })
        .eq("id", selectedBedForBooking.id)

      if (bedErr) throw bedErr

      toast.success(`Booking successful for Bed ${selectedBedForBooking.bed_number}`)
      setIsBookingOpen(false)
      fetchDormBeds(selectedDormId)
    } catch (err: any) {
      toast.error("Booking failed: " + err.message)
    } finally {
      setSubmittingBooking(false)
    }
  }

  // Open Checkout Summary dialog
  async function triggerBedCheckout(bed: any, booking: any) {
    if (!booking) return
    setSelectedBedForCheckout(bed)
    setActiveBedBooking(booking)
    setIsCheckoutOpen(true)
  }

  // Finalize Bed Checkout
  async function handleFinalizeCheckout() {
    if (!selectedBedForCheckout || !activeBedBooking) return
    setProcessingCheckout(true)
    try {
      // 1. Complete booking
      const { error: bookingErr } = await supabase
        .from("bed_bookings")
        .update({
          status: "checked_out",
          check_out_date: new Date().toISOString()
        })
        .eq("id", activeBedBooking.id)

      if (bookingErr) throw bookingErr

      // 2. Set bed to cleaning
      const { error: bedErr } = await supabase
        .from("beds")
        .update({ current_status: "cleaning" })
        .eq("id", selectedBedForCheckout.id)

      if (bedErr) throw bedErr

      toast.success(`Checked out successfully. Bed ${selectedBedForCheckout.bed_number} is now CLEANING.`)
      setIsCheckoutOpen(false)
      fetchDormBeds(selectedDormId)
    } catch (err: any) {
      toast.error("Checkout failed: " + err.message)
    } finally {
      setProcessingCheckout(false)
    }
  }

  // Organize beds into a row x column matrix for visual representation
  const getBedsMatrix = () => {
    if (beds.length === 0) return []
    
    // Find max row and col to size the grid dynamically
    const maxRow = Math.max(...beds.map(b => b.row_index))
    const maxCol = Math.max(...beds.map(b => b.col_index))
    
    const matrix: any[][] = Array.from({ length: maxRow + 1 }, () => 
      Array.from({ length: maxCol + 1 }, () => null)
    )
    
    beds.forEach(bed => {
      if (bed.row_index <= maxRow && bed.col_index <= maxCol) {
        matrix[bed.row_index][bed.col_index] = bed
      }
    })
    
    return matrix
  }

  const bedsMatrix = getBedsMatrix()

  // Status colors
  const statusColors: Record<string, { bg: string, border: string, text: string }> = {
    available: { bg: "bg-emerald-500/10 hover:bg-emerald-500/25", border: "border-emerald-500/30", text: "text-emerald-500" },
    booked: { bg: "bg-amber-500/10 hover:bg-amber-500/25", border: "border-amber-500/30", text: "text-amber-500" },
    checked_in: { bg: "bg-blue-500/10 hover:bg-blue-500/25", border: "border-blue-500/30", text: "text-blue-500" },
    checked_out: { bg: "bg-purple-500/10 hover:bg-purple-500/25", border: "border-purple-500/30", text: "text-purple-500" },
    cleaning: { bg: "bg-rose-500/10 hover:bg-rose-500/25", border: "border-rose-500/30", text: "text-rose-500" }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight">Dormitory Management</h2>
          <p className="text-muted-foreground font-medium">
            Manage bed spaces, view theater layouts, and book individual beds.
          </p>
        </div>
        <div className="flex gap-3">
          {selectedDormId && (
            <Button
              variant="outline"
              className="rounded-xl font-bold border-white/10 bg-muted/20 hover:bg-white/5 h-11 px-6 text-foreground"
              onClick={() => {
                setNewBedNumber("")
                setNewBedRow(0)
                setNewBedCol(0)
                setIsAddBedOpen(true)
              }}
            >
              <Plus className="mr-2 h-5 w-5" /> Add Bed Space
            </Button>
          )}
          <Button 
            className="rounded-xl font-bold shadow-lg shadow-primary/25 h-11 px-6"
            onClick={() => setIsCreateDormOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" /> Create Dormitory
          </Button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Dorm Visual Layout */}
        <Card className="lg:col-span-2 glass-card border-none overflow-hidden flex flex-col min-h-[500px]">
          <CardHeader className="py-6 border-b border-white/10 dark:border-white/5 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Grid className="size-5 text-violet-500" />
              <div className="w-56 md:w-64">
                <Select value={selectedDormId} onValueChange={setSelectedDormId}>
                  <SelectTrigger className="rounded-xl border-white/10 bg-muted/20 font-bold">
                    <SelectValue placeholder="Select Dormitory" />
                  </SelectTrigger>
                  <SelectContent>
                    {dormitories.map(d => (
                      <SelectItem key={d.id} value={d.id} className="font-semibold">{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedDormId && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg hover:bg-white/10 text-foreground"
                    title="Rename Dormitory"
                    onClick={() => {
                      const currentDorm = dormitories.find(d => d.id === selectedDormId)
                      setEditDormName(currentDorm?.name || "")
                      setIsEditDormOpen(true)
                    }}
                  >
                    <Edit2 className="size-4 text-muted-foreground hover:text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg hover:bg-white/10 text-foreground"
                    title="Modify Layout Grid"
                    onClick={() => {
                      if (beds.length > 0) {
                        const maxRow = Math.max(...beds.map(b => b.row_index)) + 1
                        const maxCol = Math.max(...beds.map(b => b.col_index)) + 1
                        setLayoutRows(maxRow)
                        setLayoutCols(maxCol)
                      } else {
                        setLayoutRows(4)
                        setLayoutCols(4)
                      }
                      setIsModifyLayoutOpen(true)
                    }}
                  >
                    <Settings className="size-4 text-muted-foreground hover:text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg hover:bg-rose-500/20 text-rose-500"
                    title="Delete Dormitory"
                    onClick={() => setIsDeleteDormOpen(true)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20" variant="outline">Available</Badge>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20" variant="outline">Booked</Badge>
              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20" variant="outline">Checked In</Badge>
              <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20" variant="outline">Cleaning</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-6 md:p-8 flex flex-col justify-between">
            {loading ? (
              <div className="py-20 flex-1 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary/60" />
                <span className="text-muted-foreground font-semibold">Syncing beds...</span>
              </div>
            ) : beds.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground font-medium flex-1 flex flex-col justify-center">
                No active beds in this dormitory. Setup beds to get started.
              </div>
            ) : (
              <div className="space-y-8 flex-1 flex flex-col justify-center">
                
                {/* Visual Theater screen / stage indicator */}
                <div className="relative mx-auto w-full max-w-lg">
                  <div className="h-2 w-full bg-primary/20 dark:bg-primary/10 rounded-full blur-[2px]" />
                  <div className="text-center text-[10px] uppercase font-bold tracking-widest text-primary/60 mt-1">
                    Dormitory Entrance / Walkway
                  </div>
                </div>

                {/* Theater-Style Seating Grid */}
                <div className="overflow-x-auto py-4">
                  <div className="mx-auto flex flex-col gap-4 min-w-[320px] max-w-fit">
                    {bedsMatrix.map((row, rIndex) => (
                      <div key={rIndex} className="flex gap-4 items-center">
                        {/* Row letter indicator */}
                        <div className="w-6 text-sm font-bold text-muted-foreground/60 text-center uppercase">
                          {String.fromCharCode(65 + rIndex)}
                        </div>
                        
                        {/* Bed blocks */}
                        <div className="flex gap-4">
                          {row.map((bed, cIndex) => {
                            if (!bed) return <div key={cIndex} className="size-14 border border-dashed border-white/5 rounded-xl opacity-30" />
                            const colors = statusColors[bed.current_status] || statusColors.available
                            const isFocused = focusedBed?.id === bed.id
                            
                            return (
                              <motion.button
                                key={bed.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleFocusBed(bed)}
                                className={cn(
                                  "size-14 md:size-16 rounded-xl border-2 flex flex-col items-center justify-center relative cursor-pointer transition-all duration-300",
                                  colors.bg,
                                  colors.border,
                                  isFocused ? "ring-2 ring-primary scale-105" : ""
                                )}
                              >
                                <Bed className={cn("size-5 md:size-6 mb-0.5", colors.text)} />
                                <span className="text-[10px] font-bold text-foreground opacity-90">{bed.bed_number.split("-")[1] || bed.bed_number}</span>
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid legend or walkway marker */}
                <div className="text-center text-xs text-muted-foreground/60 font-semibold italic mt-4">
                  * Click any bed space block to view booking details, make reservations, or trigger status checks.
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 1 Col: Bed Details & Operations Panel */}
        <Card className="glass-card border-none flex flex-col justify-between h-full">
          <CardHeader className="py-6 border-b border-white/10 dark:border-white/5">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-violet-500" />
              Bed Control Panel
            </CardTitle>
            <CardDescription>Details of the selected bed space</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 p-6 space-y-6">
            <AnimatePresence mode="wait">
              {focusedBed ? (
                <motion.div
                  key={focusedBed.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center bg-muted/30 p-4 border border-white/5 rounded-xl text-foreground">
                    <div>
                      <div className="text-sm font-bold text-muted-foreground uppercase">Bed Number</div>
                      <div className="text-2xl font-black mt-0.5">{focusedBed.bed_number}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg hover:bg-white/10 text-foreground"
                        title="Edit Bed"
                        onClick={() => {
                          setEditBedNumber(focusedBed.bed_number)
                          setEditBedStatus(focusedBed.current_status)
                          setEditBedRow(focusedBed.row_index)
                          setEditBedCol(focusedBed.col_index)
                          setIsEditBedOpen(true)
                        }}
                      >
                        <Edit2 className="size-4 text-muted-foreground hover:text-white" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg hover:bg-rose-500/20 text-rose-500"
                        title="Delete Bed Space"
                        onClick={() => setIsDeleteBedOpen(true)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Current Status</Label>
                    <div className="pt-1">
                      {focusedBed.current_status === "available" && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 font-bold text-sm">Available</Badge>}
                      {focusedBed.current_status === "booked" && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 font-bold text-sm">Booked (Reserved)</Badge>}
                      {focusedBed.current_status === "checked_in" && <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 font-bold text-sm">Checked In</Badge>}
                      {focusedBed.current_status === "cleaning" && <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 px-3 py-1 font-bold text-sm">Cleaning</Badge>}
                    </div>
                  </div>

                  {/* Active guest details if booked/checked-in */}
                  {focusedBedBooking && (
                    <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-xl space-y-3">
                      <h4 className="font-bold text-sm text-violet-500 flex items-center gap-1.5">
                        <User className="size-4" /> Guest Information
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">Guest Name:</span>
                          <span className="font-bold">{focusedBedBooking.customer_name}</span>
                        </div>
                        {focusedBedBooking.phone_number && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-semibold">Phone Number:</span>
                            <span className="font-bold">{focusedBedBooking.phone_number}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">Check-in Date:</span>
                          <span className="font-bold">{format(new Date(focusedBedBooking.check_in_date), "MMM d, yyyy")}</span>
                        </div>
                        {/* Payment Status indicator removed */}
                      </div>
                    </div>
                  )}

                  {/* Context Business Actions */}
                  <div className="space-y-2 pt-4">
                    {focusedBed.current_status === "available" && (
                      <Button
                        className="w-full rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 h-11"
                        onClick={() => triggerBedBooking(focusedBed)}
                      >
                        <LogIn className="size-4 mr-2" /> Book / Check-In Bed
                      </Button>
                    )}
                    
                    {focusedBed.current_status === "booked" && focusedBedBooking && (
                      <Button
                        className="w-full rounded-xl font-bold bg-blue-600 hover:bg-blue-700 h-11"
                        onClick={() => handleCheckinBedBooking(focusedBed, focusedBedBooking)}
                      >
                        <CheckCircle className="size-4 mr-2" /> Check-In Guest
                      </Button>
                    )}

                    {focusedBed.current_status === "checked_in" && focusedBedBooking && (
                      <Button
                        className="w-full rounded-xl font-bold bg-purple-600 hover:bg-purple-700 h-11"
                        onClick={() => triggerBedCheckout(focusedBed, focusedBedBooking)}
                      >
                        <LogOut className="size-4 mr-2" /> Process Check-Out
                      </Button>
                    )}

                    {focusedBed.current_status === "cleaning" && (
                      <Button
                        className="w-full rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 h-11"
                        onClick={() => handleMarkCleaned(focusedBed)}
                      >
                        <CheckCircle className="size-4 mr-2" /> Mark Cleaning Complete
                      </Button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground font-medium py-20">
                  Select any bed space from the layout grid on the left to see properties and start check-in.
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

      </div>

      {/* CREATE DORMITORY DIALOG */}
      <Dialog open={isCreateDormOpen} onOpenChange={setIsCreateDormOpen}>
        <DialogContent className="sm:max-w-[425px] glass-card border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create Dormitory & Bed Spaces</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDormitory} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="dormName" className="font-bold">Dormitory Name</Label>
              <Input
                id="dormName"
                placeholder="e.g. Gents Super Executive, Ladies Annex"
                value={dormName}
                onChange={e => setDormName(e.target.value)}
                className="rounded-xl bg-muted/20"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rows" className="font-bold">Layout Rows (A-Z)</Label>
                <Select value={String(dormRows)} onValueChange={val => setDormRows(Number(val))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6].map(num => (
                      <SelectItem key={num} value={String(num)}>{num} Rows</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="cols" className="font-bold">Layout Columns (1-10)</Label>
                <Select value={String(dormCols)} onValueChange={val => setDormCols(Number(val))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 8, 10].map(num => (
                      <SelectItem key={num} value={String(num)}>{num} Columns</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full rounded-xl font-bold" disabled={creatingDorm}>
                {creatingDorm && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Generate Dormitory & Grid
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BED BOOKING DIALOG */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="sm:max-w-[450px] glass-card border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-violet-500" />
              Book Bed space: {selectedBedForBooking?.bed_number}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBedBooking} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="font-bold flex items-center gap-1.5"><User className="size-3.5" /> Customer Name *</Label>
              <Input
                placeholder="John Doe"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="font-bold flex items-center gap-1.5"><Phone className="size-3.5" /> Phone Number (Optional)</Label>
              <Input
                placeholder="+91 9876543210"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 flex flex-col">
                <Label className="font-bold flex items-center gap-1.5 mb-1"><CalendarIcon className="size-3.5" /> Check-in Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="rounded-xl pl-3 text-left font-normal h-10">
                      {format(checkinDate, "PPP")}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkinDate}
                      onSelect={(d) => d && setCheckinDate(d)}
                      disabled={d => d < new Date(new Date().setHours(0,0,0,0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold flex items-center gap-1.5 mb-1"><BookmarkCheck className="size-3.5" /> Booking Status *</Label>
                <Select value={bookingType} onValueChange={(val: any) => setBookingType(val)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booked">Booked (Reserved)</SelectItem>
                    <SelectItem value="checked_in">Checked In (Active)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rates and Payment details removed */}

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full rounded-xl font-bold bg-violet-600 hover:bg-violet-700" disabled={submittingBooking}>
                {submittingBooking && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Bed Reservation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CHECKOUT SUMMARY DIALOG */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[450px] glass-card border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-600">
              <Sparkles className="size-5" />
              Confirm Bed Check-Out
            </DialogTitle>
          </DialogHeader>

          {activeBedBooking && selectedBedForCheckout && (
            <div className="space-y-4 py-3 text-sm">
              <div className="p-4 bg-muted/30 border border-white/5 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Guest:</span>
                  <span className="font-bold">{activeBedBooking.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Bed Space:</span>
                  <span className="font-bold">Bed {selectedBedForCheckout.bed_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Stay Dates:</span>
                  <span className="font-semibold">
                    {format(new Date(activeBedBooking.check_in_date), "MMM d")} - Today ({format(new Date(), "MMM d")})
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground text-center font-medium">
                Are you sure you want to check out this guest? The bed space status will be updated to CLEANING.
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-bold flex-1" onClick={() => setIsCheckoutOpen(false)}>
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

      {/* EDIT DORMITORY DIALOG */}
      <Dialog open={isEditDormOpen} onOpenChange={setIsEditDormOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Rename Dormitory</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateDormitory} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="editDormName" className="font-bold">New Name</Label>
              <Input
                id="editDormName"
                value={editDormName}
                onChange={e => setEditDormName(e.target.value)}
                className="rounded-xl bg-muted/20 text-foreground"
                required
              />
            </div>
            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setIsEditDormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl flex-1 font-bold bg-violet-600 hover:bg-violet-700 text-white" disabled={updatingDorm}>
                {updatingDorm && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DORMITORY DIALOG */}
      <Dialog open={isDeleteDormOpen} onOpenChange={setIsDeleteDormOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-500">Delete Dormitory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this dormitory? This will permanently remove the dormitory, all its bed spaces, and associated bookings. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="pt-4 flex gap-2">
            <Button variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setIsDeleteDormOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDeleteDormitory} disabled={deletingDorm}>
              {deletingDorm && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD BED SPACE DIALOG */}
      <Dialog open={isAddBedOpen} onOpenChange={setIsAddBedOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Bed Space</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBed} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="newBedNumber" className="font-bold">Bed Number/Label</Label>
              <Input
                id="newBedNumber"
                placeholder="e.g. L-A5, G-B3"
                value={newBedNumber}
                onChange={e => setNewBedNumber(e.target.value)}
                className="rounded-xl bg-muted/20 text-foreground"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="newBedRow" className="font-bold">Row Index (0-based)</Label>
                <Input
                  id="newBedRow"
                  type="number"
                  min={0}
                  value={newBedRow}
                  onChange={e => setNewBedRow(Number(e.target.value))}
                  className="rounded-xl bg-muted/20 text-foreground"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newBedCol" className="font-bold">Col Index (0-based)</Label>
                <Input
                  id="newBedCol"
                  type="number"
                  min={0}
                  value={newBedCol}
                  onChange={e => setNewBedCol(Number(e.target.value))}
                  className="rounded-xl bg-muted/20 text-foreground"
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setIsAddBedOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl flex-1 font-bold bg-violet-600 hover:bg-violet-700 text-white" disabled={submittingBed}>
                {submittingBed && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Add Bed
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT BED SPACE DIALOG */}
      <Dialog open={isEditBedOpen} onOpenChange={setIsEditBedOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Bed Space</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBed} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="editBedNumber" className="font-bold">Bed Number/Label</Label>
              <Input
                id="editBedNumber"
                value={editBedNumber}
                onChange={e => setEditBedNumber(e.target.value)}
                className="rounded-xl bg-muted/20 text-foreground"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold">Status</Label>
              <Select value={editBedStatus} onValueChange={(val: any) => setEditBedStatus(val)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="booked">Booked (Reserved)</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editBedRow" className="font-bold">Row Index</Label>
                <Input
                  id="editBedRow"
                  type="number"
                  min={0}
                  value={editBedRow}
                  onChange={e => setEditBedRow(Number(e.target.value))}
                  className="rounded-xl bg-muted/20 text-foreground"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editBedCol" className="font-bold">Col Index</Label>
                <Input
                  id="editBedCol"
                  type="number"
                  min={0}
                  value={editBedCol}
                  onChange={e => setEditBedCol(Number(e.target.value))}
                  className="rounded-xl bg-muted/20 text-foreground"
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setIsEditBedOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl flex-1 font-bold bg-violet-600 hover:bg-violet-700 text-white" disabled={updatingBed}>
                {updatingBed && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE BED SPACE DIALOG */}
      <Dialog open={isDeleteBedOpen} onOpenChange={setIsDeleteBedOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-500">Delete Bed Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete bed space <span className="font-bold text-foreground">{focusedBed?.bed_number}</span>? This will permanently remove the bed space from the system.
            </p>
          </div>
          <DialogFooter className="pt-4 flex gap-2">
            <Button variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setIsDeleteBedOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDeleteBed} disabled={deletingBed}>
              {deletingBed && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODIFY LAYOUT GRID DIALOG */}
      <Dialog open={isModifyLayoutOpen} onOpenChange={setIsModifyLayoutOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border-none text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Modify Layout Grid</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModifyLayout} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="layoutRows" className="font-bold">Rows</Label>
                <Input
                  id="layoutRows"
                  type="number"
                  min={1}
                  max={20}
                  value={layoutRows}
                  onChange={e => setLayoutRows(Number(e.target.value))}
                  className="rounded-xl bg-muted/20 text-foreground"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="layoutCols" className="font-bold">Columns</Label>
                <Input
                  id="layoutCols"
                  type="number"
                  min={1}
                  max={20}
                  value={layoutCols}
                  onChange={e => setLayoutCols(Number(e.target.value))}
                  className="rounded-xl bg-muted/20 text-foreground"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Resizing the grid will create new beds in newly added positions, and delete existing empty beds in positions that fall outside the new grid dimensions. Beds with active bookings will block resizing.
            </p>
            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="rounded-xl flex-1 font-bold text-foreground" onClick={() => setIsModifyLayoutOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl flex-1 font-bold bg-violet-600 hover:bg-violet-700 text-white" disabled={modifyingLayout}>
                {modifyingLayout && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Apply Grid
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
