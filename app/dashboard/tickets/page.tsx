"use client"

import { useState } from "react"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function TicketsPage() {
  const [tickets, setTickets] = useState([
    {
      id: "TKT-001",
      subject: "Login page not loading",
      client: "Acme Corp",
      priority: "High",
      status: "Open",
      assignee: "John Doe",
      created: "2026-01-15",
    },
    {
      id: "TKT-002",
      subject: "Feature request: Export to PDF",
      client: "TechStart Inc",
      priority: "Medium",
      status: "In Progress",
      assignee: "Sarah Smith",
      created: "2026-01-14",
    },
    {
      id: "TKT-003",
      subject: "Performance issues on dashboard",
      client: "Global Solutions",
      priority: "High",
      status: "In Progress",
      assignee: "Mike Johnson",
      created: "2026-01-14",
    },
    {
      id: "TKT-004",
      subject: "Question about billing",
      client: "Innovation Labs",
      priority: "Low",
      status: "Open",
      assignee: "Emily Davis",
      created: "2026-01-13",
    },
    {
      id: "TKT-005",
      subject: "Bug: Data not syncing",
      client: "Enterprise Systems",
      priority: "High",
      status: "Resolved",
      assignee: "John Doe",
      created: "2026-01-12",
    },
  ])

  useSupabaseRealtime<any>({
    table: "tickets",
    onInsert: (payload) => setTickets(prev => [payload.new, ...prev]),
    onUpdate: (payload) => setTickets(prev => prev.map(ticket => ticket.id === payload.new.id ? payload.new : ticket)),
    onDelete: (payload) => setTickets(prev => prev.filter(ticket => ticket.id !== payload.old.id))
  })


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Open: "bg-info/10 text-info",
      "In Progress": "bg-primary/10 text-primary",
      Resolved: "bg-success/10 text-success",
      Closed: "bg-secondary text-secondary-foreground",
    }
    return colors[status] || "bg-secondary"
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: "bg-destructive/10 text-destructive",
      Medium: "bg-warning/10 text-warning",
      Low: "bg-success/10 text-success",
    }
    return colors[priority] || "bg-secondary"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Support Tickets</h1>
            <p className="text-muted-foreground mt-1">Manage customer support requests and issues</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>

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
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer">
                      <TableCell className="font-mono text-sm">{ticket.id}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{ticket.subject}</TableCell>
                      <TableCell className="text-muted-foreground">{ticket.client}</TableCell>
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
                      <TableCell className="text-muted-foreground">{ticket.assignee}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(ticket.created).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
