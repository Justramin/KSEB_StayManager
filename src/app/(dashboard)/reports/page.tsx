"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, PieChart, Calendar, TrendingUp, Users, Bed, ArrowRight, Share2, Printer, Building2, ClipboardList } from "lucide-react"
import { generateRoomReport, generateHallReport, generateDormReport, generateAttendanceReport } from "@/lib/reports"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function ReportsPage() {
  const handleExport = async (type: 'room' | 'hall' | 'dorm' | 'attendance') => {
    let promise;
    if (type === 'room') promise = generateRoomReport();
    else if (type === 'hall') promise = generateHallReport();
    else if (type === 'dorm') promise = generateDormReport();
    else promise = generateAttendanceReport('monthly');

    toast.promise(
      promise,
      {
        loading: `Generating ${type} report...`,
        success: `${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully!`,
        error: `Failed to generate ${type} report`,
      }
    )
  }

  const reports = [
    {
      title: "Daily Room Bookings",
      description: "Detailed list of all room bookings and customer stays for today.",
      icon: Bed,
      color: "bg-blue-500",
      type: "room" as const,
    },
    {
      title: "Daily Hall Bookings",
      description: "Comprehensive report of all hall events and scheduled time slots.",
      icon: Users,
      color: "bg-purple-500",
      type: "hall" as const,
    },
    {
      title: "Dormitory Bed Bookings",
      description: "Detailed list of all dormitory bed space bookings and current occupancy.",
      icon: Building2,
      color: "bg-violet-500",
      type: "dorm" as const,
    },
    {
      title: "Staff Attendance Summary",
      description: "Roster performance review, presence rate, and monthly tracked days.",
      icon: ClipboardList,
      color: "bg-pink-500",
      type: "attendance" as const,
    },
    {
      title: "Property Occupancy Summary",
      description: "Summary of room availability, total stays, and property utilization.",
      icon: PieChart,
      color: "bg-emerald-500",
      type: "room" as const, // Placeholder for occupancy
    }
  ]

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground font-medium">Analyze your business performance with automated data exports.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl h-11 border-2 font-bold gap-2">
            <Printer className="size-4" /> Print All
          </Button>
          <Button className="rounded-xl h-11 font-bold gap-2 shadow-lg shadow-primary/25">
            <Share2 className="size-4" /> Share Dashboard
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report, index) => (
          <motion.div
            key={report.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass-card border-none group relative overflow-hidden h-full flex flex-col">
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500", report.color)} />
              <CardHeader>
                <div className={cn("rounded-2xl w-14 h-14 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300", `${report.color} text-white`)}>
                  <report.icon className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl font-bold">{report.title}</CardTitle>
                <CardDescription className="text-sm font-medium leading-relaxed">{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-6">
                <Button 
                  className={cn("w-full rounded-xl font-bold h-11 transition-all", report.color, "hover:scale-[1.02] shadow-lg shadow-black/5")}
                  onClick={() => handleExport(report.type)}
                >
                  <Download className="mr-2 h-4 w-4" /> Export PDF
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 glass-card border-none overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Generation History</CardTitle>
              <CardDescription>Track your recently generated documents</CardDescription>
            </div>
            <TrendingUp className="text-emerald-500 size-5" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "room_report_20240514.pdf", size: "1.2 MB", date: "2 hours ago", status: "Success" },
                { name: "hall_report_20240514.pdf", size: "850 KB", date: "5 hours ago", status: "Success" },
                { name: "occupancy_summary.pdf", size: "2.1 MB", date: "Yesterday", status: "Failed" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-background flex items-center justify-center">
                      <FileText className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.size} &bull; {item.date}</p>
                    </div>
                  </div>
                  <Badge variant={item.status === 'Success' ? 'secondary' : 'destructive'} className="rounded-lg font-bold">
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-indigo-600 to-primary text-primary-foreground border-none relative overflow-hidden h-full">
          <div className="absolute -bottom-10 -right-10 opacity-20 rotate-12">
            <PieChart size={200} />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl font-bold">Custom Analytics</CardTitle>
            <CardDescription className="text-indigo-100/70 font-medium">Need a specialized report for your business?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <p className="text-sm leading-relaxed text-indigo-50 font-medium">
              We can help you build custom SQL queries and visual dashboards tailored to your specific management needs.
            </p>
            <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold h-12 shadow-xl shadow-black/10">
              Contact Support <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
