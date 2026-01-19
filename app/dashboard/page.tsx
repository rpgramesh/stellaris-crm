"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, Briefcase, DollarSign, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await apiClient.getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error("[v0] Failed to fetch dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    )
  }

  const displayStats = stats || {
    leads: { total: 0, change: 0 },
    clients: { total: 0, change: 0 },
    projects: { total: 0, change: 0 },
    revenue: { total: 0, change: 0 },
  }

  const isAdminLike = user?.role?.name === "admin" || user?.role?.name === "manager"

  const statsCards = [
    {
      title: "Total Leads",
      value: displayStats.leads?.total?.toString() || "0",
      change: `+${displayStats.leads?.change || 0}%`,
      trend: (displayStats.leads?.change || 0) >= 0 ? "up" : "down",
      icon: TrendingUp,
    },
    ...(isAdminLike
      ? [
          {
            title: "Active Clients",
            value: displayStats.clients?.total?.toString() || "0",
            change: `+${displayStats.clients?.change || 0}%`,
            trend: (displayStats.clients?.change || 0) >= 0 ? "up" : "down",
            icon: Users,
          },
          {
            title: "Active Projects",
            value: displayStats.projects?.total?.toString() || "0",
            change: `${displayStats.projects?.change || 0} this month`,
            trend: "neutral",
            icon: Briefcase,
          },
          {
            title: "Revenue (MTD)",
            value: `$${displayStats.revenue?.total?.toLocaleString() || "0"}`,
            change: `+${displayStats.revenue?.change || 0}%`,
            trend: (displayStats.revenue?.change || 0) >= 0 ? "up" : "down",
            icon: DollarSign,
          },
        ]
      : []),
  ]

  const recentLeads = [
    { id: 1, company: "Acme Corp", contact: "John Smith", stage: "Qualified", value: "$45,000" },
    { id: 2, company: "TechStart Inc", contact: "Sarah Johnson", stage: "Proposal", value: "$32,000" },
    { id: 3, company: "Global Solutions", contact: "Mike Davis", stage: "Negotiation", value: "$78,000" },
  ]

  const upcomingTasks = [
    { id: 1, title: "Follow up with Acme Corp", dueDate: "Today, 2:00 PM", priority: "High" },
    { id: 2, title: "Prepare proposal for TechStart", dueDate: "Tomorrow, 10:00 AM", priority: "Medium" },
    { id: 3, title: "Client meeting - Global Solutions", dueDate: "Jan 17, 3:00 PM", priority: "High" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here's your business overview.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p
                  className={cn(
                    "text-xs flex items-center gap-1 mt-1",
                    stat.trend === "up"
                      ? "text-success"
                      : stat.trend === "down"
                        ? "text-destructive"
                        : "text-muted-foreground",
                  )}
                >
                  {stat.trend === "up" && <ArrowUp className="h-3 w-3" />}
                  {stat.trend === "down" && <ArrowDown className="h-3 w-3" />}
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent Leads */}
          <Card>
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
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium">{lead.company}</p>
                      <p className="text-sm text-muted-foreground">{lead.contact}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{lead.value}</p>
                      <p className="text-sm text-muted-foreground">{lead.stage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Tasks</CardTitle>
                  <CardDescription>Tasks that need your attention</CardDescription>
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
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.dueDate}</p>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-md",
                        task.priority === "High" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning",
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
