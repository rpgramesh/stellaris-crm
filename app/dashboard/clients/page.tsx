"use client"

import { useState } from "react"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Search, Filter, MoreHorizontal, Building2 } from "lucide-react"

export default function ClientsPage() {
  const [clients, setClients] = useState([
    {
      id: 1,
      name: "Acme Corporation",
      contact: "John Smith",
      email: "john@acme.com",
      phone: "+1 555-0123",
      status: "Active",
      projects: 3,
      revenue: "$125,000",
    },
    {
      id: 2,
      name: "TechStart Inc",
      contact: "Sarah Johnson",
      email: "sarah@techstart.com",
      phone: "+1 555-0124",
      status: "Active",
      projects: 2,
      revenue: "$87,500",
    },
    {
      id: 3,
      name: "Global Solutions",
      contact: "Mike Davis",
      email: "mike@global.com",
      phone: "+1 555-0125",
      status: "Active",
      projects: 5,
      revenue: "$245,000",
    },
    {
      id: 4,
      name: "Innovation Labs",
      contact: "Emily Chen",
      email: "emily@innovation.com",
      phone: "+1 555-0126",
      status: "Inactive",
      projects: 0,
      revenue: "$0",
    },
  ])

  useSupabaseRealtime<any>({
    table: "clients",
    onInsert: (payload) => setClients(prev => [payload.new, ...prev]),
    onUpdate: (payload) => setClients(prev => prev.map(client => client.id === payload.new.id ? payload.new : client)),
    onDelete: (payload) => setClients(prev => prev.filter(client => client.id !== payload.old.id))
  })


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your client relationships and accounts</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle>All Clients</CardTitle>
                <CardDescription>A complete list of your client accounts</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search clients..." className="pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {clients.map((client) => (
                <Card key={client.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <Building2 className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{client.name}</CardTitle>
                          <CardDescription className="text-sm">{client.contact}</CardDescription>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={client.status === "Active" ? "default" : "secondary"}>{client.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active Projects</span>
                      <span className="font-medium">{client.projects}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Revenue</span>
                      <span className="font-medium">{client.revenue}</span>
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
