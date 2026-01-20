"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, Briefcase, DollarSign, ArrowUp, ArrowDown, RefreshCw, Phone, Mail, Eye, CheckCircle2 } from "lucide-react"
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
        apiClient.getLeads({ page_size: 10, sort: "created_at:desc" }),
        apiClient.getTasks({ page_size: 10, status: "todo", sort: "due_date:asc", due_before: dueBefore }),
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
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.full_name}! Here's your business overview.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Last updated: {format(lastUpdated, "h:mm:ss a")}</span>
            <Button variant="outline" size="icon" onClick={() => loadData(true)} disabled={loading || isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Leads */}
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
              {/* Active Clients */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="cursor-help">
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

              {/* Active Projects */}
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

              {/* Revenue (MTD) */}
              <Card>
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

        <div className="grid gap-4 lg:grid-cols-7">
          {/* Revenue Chart */}
          {isAdminLike && (
            <Card className="col-span-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue Overview</CardTitle>
                    <CardDescription>Revenue performance over time</CardDescription>
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(value) => `$${value}`} 
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                          labelFormatter={(label, payload) => payload[0]?.payload?.fullLabel || label}
                          cursor={{ fill: 'transparent' }}
                        />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
          <Card className={cn("col-span-3", !isAdminLike && "col-span-7 lg:col-span-7")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Leads</CardTitle>
                  <CardDescription>Latest leads in your pipeline</CardDescription>
                </div>
                <Link href="/dashboard/leads">
                  <Button variant="outline" size="sm">
                    View all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentLeads.length > 0 ? (
                  recentLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-medium truncate">{lead.company || `${lead.first_name} ${lead.last_name}`}</p>
                        <p className="text-sm text-muted-foreground truncate">{lead.first_name} {lead.last_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(lead.created_at), "MMM d, h:mm a")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize whitespace-nowrap hidden sm:inline-flex">{lead.stage?.replace("_", " ")}</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dashboard/leads/${lead.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {lead.email && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={`mailto:${lead.email}`}>
                                <Mail className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {lead.phone && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={`tel:${lead.phone}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">No recent leads</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Upcoming Tasks */}
          <Card className="col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Tasks</CardTitle>
                  <CardDescription>Tasks due in the next 7 days</CardDescription>
                </div>
                <Link href="/dashboard/tasks">
                  <Button variant="outline" size="sm">
                    View all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0 group">
                      <Checkbox 
                        id={`task-${task.id}`} 
                        onCheckedChange={() => handleTaskComplete(task.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={`task-${task.id}`}
                          className="font-medium cursor-pointer hover:underline"
                        >
                          {task.title}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Due: {task.due_date ? format(new Date(task.due_date), "MMM d, h:mm a") : "No date"}
                        </p>
                      </div>
                      <Badge 
                        variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">No upcoming tasks for next 7 days</div>
                )}
              </div>
            </CardContent>
          </Card>

           {/* Quick Actions */}
           <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used actions</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 grid-cols-2">
               <Link href="/dashboard/leads/new">
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors">
                    <TrendingUp className="h-6 w-6" />
                    <span>Add Lead</span>
                  </Button>
               </Link>
               <Link href="/dashboard/tasks">
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors">
                    <Briefcase className="h-6 w-6" />
                    <span>Create Task</span>
                  </Button>
               </Link>
               {isAdminLike && (
                 <>
                   <Link href="/dashboard/invoices">
                      <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors">
                        <DollarSign className="h-6 w-6" />
                        <span>New Invoice</span>
                      </Button>
                   </Link>
                   <Link href="/dashboard/clients">
                      <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors">
                        <Users className="h-6 w-6" />
                        <span>Add Client</span>
                      </Button>
                   </Link>
                 </>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
