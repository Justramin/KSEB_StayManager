"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, History as HistoryIcon, Calendar } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { format } from "date-fns"

export default function HistoryPage() {
  const supabase = createClient()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    try {
      const { data: rooms } = await supabase
        .from("bookings")
        .select("*, rooms(room_number)")
        .eq("status", "completed")

      const { data: halls } = await supabase
        .from("hall_bookings")
        .select("*")
        .eq("status", "completed")

      const combined = [
        ...(rooms || []).map(b => ({
          id: b.id,
          type: "Room",
          customer: b.customer_name,
          details: `Room ${b.rooms?.room_number}`,
          date: b.check_in_date,
          completedAt: b.check_out_date,
        })),
        ...(halls || []).map(b => ({
          id: b.id,
          type: "Hall",
          customer: b.customer_name,
          details: b.purpose || "Event",
          date: b.event_date,
          completedAt: b.created_at, // Use created_at or another field
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setHistory(combined)
    } catch (error) {
      console.error("Error fetching history:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = history.filter(h => 
    h.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.details.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Booking History</h2>
        <p className="text-muted-foreground">
          View all past room and hall bookings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading history...
                    </TableCell>
                  </TableRow>
                ) : filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{item.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.customer}</TableCell>
                      <TableCell>{item.details}</TableCell>
                      <TableCell>{format(new Date(item.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                          Completed
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
