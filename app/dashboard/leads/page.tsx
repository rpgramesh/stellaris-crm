"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Filter, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { AddLeadDialog } from "./add-lead-dialog"

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    fetchLeads()
  }, [])

  useSupabaseRealtime<any>({
    table: "leads",
    schema: "public",
    onInsert: (payload) => {
      setLeads((current) => {
        const exists = current.some((lead) => lead.id === payload.new.id)
        if (exists) {
          return current
        }
        return [payload.new, ...current]
      })
    },
    onUpdate: (payload) => {
      setLeads((current) => current.map((lead) => (lead.id === payload.new.id ? payload.new : lead)))
    },
    onDelete: (payload) => {
      setLeads((current) => current.filter((lead) => lead.id !== payload.old.id))
    },
  })

  const fetchLeads = async () => {
    try {
      const data: any = await apiClient.getLeads()
      setLeads(data.items || data || [])
    } catch (error) {
      console.error("[v0] Failed to fetch leads:", error)
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConvertLead = async (id: number) => {
    try {
      await apiClient.convertLead(id)
      toast({
        title: "Success",
        description: "Lead converted to client successfully",
      })
      fetchLeads()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert lead",
        variant: "destructive",
      })
    }
  }

  const handleDeleteLead = async (id: number) => {
    try {
      await apiClient.deleteLead(id)
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      })
      fetchLeads()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      })
    }
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      new: "bg-secondary text-secondary-foreground",
      contacted: "bg-info/10 text-info",
      qualified: "bg-primary/10 text-primary",
      proposal: "bg-warning/10 text-warning",
      negotiation: "bg-success/10 text-success",
    }
    return colors[stage?.toLowerCase()] || "bg-secondary"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground mt-1">
              {user?.role?.name === "sales"
                ? "Your personal sales pipeline and lead progression"
                : "Manage the full sales pipeline and track lead progression"}
            </p>
          </div>
          {(user?.role?.name === "admin" || user?.role?.name === "manager" || user?.role?.name === "sales") && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle>{user?.role?.name === "sales" ? "Your Leads" : "All Leads"}</CardTitle>
                <CardDescription>
                  {user?.role?.name === "sales"
                    ? "Leads assigned to you in the sales pipeline"
                    : "A list of all leads in the sales pipeline"}
                </CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search leads..." className="pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-muted-foreground mb-4">No leads found</p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first lead
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.company}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{lead.first_name} {lead.last_name}</span>
                            <span className="text-xs text-muted-foreground">{lead.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStageColor(lead.stage)}>
                            {lead.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">${lead.estimated_value?.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.source}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View details</DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleConvertLead(lead.id)}>
                                Convert to client
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteLead(lead.id)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AddLeadDialog 
        open={isAddLeadOpen} 
        onOpenChange={setIsAddLeadOpen} 
        onSuccess={fetchLeads}
      />
    </DashboardLayout>
  )
}
