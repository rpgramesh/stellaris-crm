"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, Briefcase, DollarSign, ArrowUp, ArrowDown, RefreshCw, Phone, Mail, Eye, CheckCircle2, Calendar, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { toast } from "sonner"
import { format, addDays } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [period, setPeriod] = useState<"weekly" | "monthly" | "quarterly">("monthly")
  const { user } = useAuth()

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const dueBefore = addDays(new Date(), 7).toISOString().split('T')[0]

      const [statsRes, leadsRes, tasksRes, revenueRes] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getLeads({ page_size: 5, sort: "created_at:desc" }),
        apiClient.getTasks({ page_size: 5, status: "todo", sort: "due_date:asc", due_before: dueBefore }),
        apiClient.getRevenueReport(undefined, undefined, period)
      ])

      setStats(statsRes)
      setRecentLeads(leadsRes.items || [])
      setUpcomingTasks(tasksRes.items || [])
      setRevenueData(revenueRes)
      setLastUpdated(new Date())

      if (isRefresh) {
        toast.success("Dashboard updated")
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      toast.error("Failed to update dashboard")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [period])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscriptions
  const handleRealtimeUpdate = useCallback(() => {
    loadData(true)
  }, [loadData])

  useSupabaseRealtime({ table: "leads", onInsert: handleRealtimeUpdate, onUpdate: handleRealtimeUpdate, onDelete: handleRealtimeUpdate })
  useSupabaseRealtime({ table: "tasks", onInsert: handleRealtimeUpdate, onUpdate: handleRealtimeUpdate, onDelete: handleRealtimeUpdate })
  useSupabaseRealtime({ table: "invoices", onInsert: handleRealtimeUpdate, onUpdate: handleRealtimeUpdate, onDelete: handleRealtimeUpdate })
  useSupabaseRealtime({ table: "clients", onInsert: handleRealtimeUpdate, onUpdate: handleRealtimeUpdate, onDelete: handleRealtimeUpdate })
  useSupabaseRealtime({ table: "projects", onInsert: handleRealtimeUpdate, onUpdate: handleRealtimeUpdate, onDelete: handleRealtimeUpdate })

  const handleTaskComplete = async (taskId: string) => {
    try {
      await apiClient.updateTask(taskId, { status: "completed" })
      toast.success("Task completed")
      setUpcomingTasks(prev => prev.filter(t => t.id !== taskId))
      // Optionally refresh stats to update counters
      const statsRes = await apiClient.getDashboardStats()
      setStats(statsRes)
    } catch (error) {
      toast.error("Failed to complete task")
    }
  }

  if (loading && !stats) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const displayStats = stats || {
    leads: { total: 0, new_this_month: 0, conversion_rate: 0 },
    summary: { active_clients: 0, active_clients_list: [], active_projects: 0, avg_project_completion: 0 },
    projects: { active: 0, total: 0 },
    financial: { revenue_this_month: 0, revenue_growth_percent: 0 },
  }

  const isAdminLike = user?.role?.name === "admin" || user?.role?.name === "manager"

  const chartData = revenueData?.revenue_data?.map((item: any) => ({
    name: item.label,
    revenue: item.revenue,
    fullLabel: item.label
  })) || []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of your business performance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              Updated: {format(lastUpdated, "h:mm a")}
            </span>
            <Button variant="outline" size="icon" onClick={() => loadData(true)} disabled={loading || isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Link href="/dashboard/leads?new=true">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/leads">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayStats.leads?.total?.toString() || "0"}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  +{displayStats.leads?.new_this_month || 0} this month
                </p>
              </CardContent>
            </Card>
          </Link>

          {isAdminLike && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="cursor-help hover:bg-accent/50 transition-colors h-full">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{displayStats.summary?.active_clients?.toString() || "0"}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-semibold mb-1">Active Clients:</p>
                      {displayStats.summary?.active_clients_list?.length > 0 ? (
                        <ul className="list-disc pl-3">
                          {displayStats.summary.active_clients_list.slice(0, 10).map((name: string, i: number) => (
                            <li key={i}>{name}</li>
                          ))}
                          {displayStats.summary.active_clients_list.length > 10 && (
                            <li>+{displayStats.summary.active_clients_list.length - 10} more</li>
                          )}
                        </ul>
                      ) : (
                        <p>No active clients</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Link href="/dashboard/projects">
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{displayStats.summary?.active_projects?.toString() || "0"}</div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Avg. Completion</span>
                        <span>{displayStats.summary?.avg_project_completion || 0}%</span>
                      </div>
                      <Progress value={displayStats.summary?.avg_project_completion || 0} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${displayStats.financial?.revenue_this_month?.toLocaleString() || "0"}</div>
                  <p
                    className={cn(
                      "text-xs flex items-center gap-1 mt-1",
                      (displayStats.financial?.revenue_growth_percent || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {(displayStats.financial?.revenue_growth_percent || 0) >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(displayStats.financial?.revenue_growth_percent || 0)}% from last month
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
          
          {/* Left Column (Main) */}
          <div className="col-span-4 md:col-span-4 lg:col-span-5 space-y-4">
            
            {/* Revenue Chart */}
            {isAdminLike && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Revenue Overview</CardTitle>
                      <CardDescription>Performance over time</CardDescription>
                    </div>
                    <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px] w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={10}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `$${value}`} 
                          />
                          <RechartsTooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              borderColor: 'hsl(var(--border))', 
                              borderRadius: 'var(--radius)' 
                            }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                            labelFormatter={(label, payload) => payload[0]?.payload?.fullLabel || label}
                            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.2 }}
                          />
                          <Bar 
                            dataKey="revenue" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No revenue data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Leads */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Leads</CardTitle>
                    <CardDescription>Latest pipeline activity</CardDescription>
                  </div>
                  <Link href="/dashboard/leads">
                    <Button variant="outline" size="sm">
                      View all
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {recentLeads.length > 0 ? (
                    recentLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between py-3 px-2 hover:bg-accent/50 rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                             <TrendingUp className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-sm">{lead.company || `${lead.first_name} ${lead.last_name}`}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.first_name} {lead.last_name} • {format(new Date(lead.created_at), "MMM d")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize whitespace-nowrap text-xs h-6">{lead.stage?.replace("_", " ")}</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dashboard/leads/${lead.id}`}>
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No recent leads</div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column (Sidebar) */}
          <div className="col-span-3 md:col-span-3 lg:col-span-2 space-y-4">
            
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                 <Link href="/dashboard/leads?new=true" className="w-full">
                    <Button variant="outline" className="w-full h-20 flex flex-col gap-1 hover:border-primary hover:text-primary transition-all shadow-sm">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-xs">Add Lead</span>
                    </Button>
                 </Link>
                 <Link href="/dashboard/tasks?new=true" className="w-full">
                    <Button variant="outline" className="w-full h-20 flex flex-col gap-1 hover:border-primary hover:text-primary transition-all shadow-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-xs">New Task</span>
                    </Button>
                 </Link>
                 {isAdminLike && (
                   <>
                     <Link href="/dashboard/invoices?new=true" className="w-full">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-1 hover:border-primary hover:text-primary transition-all shadow-sm">
                          <DollarSign className="h-5 w-5" />
                          <span className="text-xs">Invoice</span>
                        </Button>
                     </Link>
                     <Link href="/dashboard/clients?new=true" className="w-full">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-1 hover:border-primary hover:text-primary transition-all shadow-sm">
                          <Users className="h-5 w-5" />
                          <span className="text-xs">Client</span>
                        </Button>
                     </Link>
                   </>
                 )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Upcoming Tasks</CardTitle>
                  <Link href="/dashboard/tasks">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowUp className="h-4 w-4 rotate-45" />
                    </Button>
                  </Link>
                </div>
                <CardDescription>Due in next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingTasks.length > 0 ? (
                    upcomingTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group">
                        <Checkbox 
                          id={`task-${task.id}`} 
                          onCheckedChange={() => handleTaskComplete(task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`task-${task.id}`}
                            className="text-sm font-medium cursor-pointer hover:text-primary transition-colors block truncate"
                          >
                            {task.title}
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                             <Badge 
                              variant={task.priority === "high" ? "destructive" : "secondary"}
                              className="text-[10px] px-1.5 h-5"
                            >
                              {task.priority}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {task.due_date ? format(new Date(task.due_date), "MMM d") : "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-sm">All caught up!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}