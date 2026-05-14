import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: string
    positive: boolean
  }
  className?: string
  onClick?: () => void
  delay?: number
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  onClick,
  delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card 
        className={cn(
          "glass-card group relative overflow-hidden border-none",
          onClick && "cursor-pointer active:scale-[0.98]",
          className
        )}
        onClick={onClick}
      >
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {title}
          </CardTitle>
          <div className="rounded-xl bg-primary/10 p-2.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
          {description && (
            <p className="text-xs font-medium text-muted-foreground/80">{description}</p>
          )}
          {trend && (
            <div className="mt-3 flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
                  trend.positive 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.positive ? "+" : "-"}{trend.value}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">vs last week</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
