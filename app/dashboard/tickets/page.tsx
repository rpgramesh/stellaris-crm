"use client"

import { useState, useEffect } from "react"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AddTicketDialog } from "./components/add-ticket-dialog"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

export default function TicketsPage() {
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [clients, setClients] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [ticketsRes, clientsRes, usersRes, statsRes, analyticsRes] = await Promise.all([
        apiClient.getTickets(),
        apiClient.getClients(),
        apiClient.getUsers(),
        apiClient.getDashboardStats(),
        apiClient.getTicketAnalytics()
      ])

      const ticketList = Array.isArray(ticketsRes) ? ticketsRes : (ticketsRes.items || [])
      setTickets(ticketList)

      const clientMap: Record<string, string> = {}
      const clientList = Array.isArray(clientsRes) ? clientsRes : (clientsRes.items || [])
      clientList.forEach((c: any) => clientMap[c.id] = c.company_name)
      setClients(clientMap)

      const userMap: Record<string, string> = {}
      const userList = Array.isArray(usersRes) ? usersRes : (usersRes.items || [])
      userList.forEach((u: any) => userMap[u.id] = u.full_name)
      setUsers(userMap)
      
      setStats(statsRes)
      setAnalytics(analyticsRes)

    } catch (error) {
      console.error("Failed to load ticket data:", error)
      toast.error("Failed to load ticket data")
    } finally {
      setLoading(false)
    }
  }

  useSupabaseRealtime<any>({
    table: "tickets",
    onInsert: (payload) => setTickets(prev => [payload.new, ...prev]),
    onUpdate: (payload) => setTickets(prev => prev.map(ticket => ticket.id === payload.new.id ? payload.new : ticket)),
    onDelete: (payload) => setTickets(prev => prev.filter(ticket => ticket.id !== payload.old.id))
  })


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-info/10 text-info",
      in_progress: "bg-primary/10 text-primary",
      resolved: "bg-success/10 text-success",
      closed: "bg-secondary text-secondary-foreground",
    }
    return colors[status?.toLowerCase()] || "bg-secondary"
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-destructive/10 text-destructive",
      medium: "bg-warning/10 text-warning",
      low: "bg-success/10 text-success",
      critical: "bg-destructive text-destructive-foreground"
    }
    return colors[priority?.toLowerCase()] || "bg-secondary"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Support Tickets</h1>
            <p className="text-muted-foreground mt-1">Manage customer support requests and issues</p>
          </div>
          <Button onClick={() => setIsAddTicketOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.tickets?.open || 0}</div>
              <p className="text-xs text-muted-foreground">Active issues</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.tickets?.created_this_month || 0}</div>
              <p className="text-xs text-muted-foreground">Volume trend</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
              </div>
              <p className="text-xs text-muted-foreground">Total resolved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4h</div>
              <p className="text-xs text-muted-foreground">Est. average</p>
            </CardContent>
          </Card>
        </div>

        {analytics && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Status</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.by_status}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Priority</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.by_priority}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="priority" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle>All Tickets</CardTitle>
                <CardDescription>Track and resolve customer support tickets</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search tickets..." className="pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="text-center py-4">Loading tickets...</div>
            ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={7} className="text-center">No tickets found</TableCell>
                      </TableRow>
                  ) : tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer">
                      <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{ticket.subject}</TableCell>
                      <TableCell className="text-muted-foreground">{clients[ticket.client_id] || "Unknown"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{users[ticket.assigned_to] || "Unassigned"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
        <AddTicketDialog 
          open={isAddTicketOpen}
          onOpenChange={setIsAddTicketOpen}
          onSuccess={(ticket) => {
            setTickets(prev => [{
              ...ticket,
              // Optimistic or waiting for realtime
            }, ...prev])
            // Reload to get full relations if needed
            loadData()
          }}
        />
      </div>
    </DashboardLayout>
  )
}

