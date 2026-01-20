"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Filter, MoreHorizontal, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useAuth } from "@/hooks/use-auth"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { AddLeadDialog } from "./add-lead-dialog"
import { ViewLeadDialog } from "./view-lead-dialog"
import { EditLeadDialog } from "./edit-lead-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  
  // Dialog states
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
  const [isViewLeadOpen, setIsViewLeadOpen] = useState(false)
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isConvertAlertOpen, setIsConvertAlertOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

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

  const handleViewLead = (lead: any) => {
    setSelectedLead(lead)
    setIsViewLeadOpen(true)
  }

  const handleEditLead = (lead: any) => {
    setSelectedLead(lead)
    setIsEditLeadOpen(true)
  }

  const confirmConvertLead = (lead: any) => {
    setSelectedLead(lead)
    setIsConvertAlertOpen(true)
  }

  const confirmDeleteLead = (lead: any) => {
    setSelectedLead(lead)
    setIsDeleteAlertOpen(true)
  }

  const handleConvertLead = async () => {
    if (!selectedLead) return

    // Validation: Ensure email exists
    if (!selectedLead.email) {
      toast({
        title: "Cannot Convert",
        description: "Lead must have an email address to be converted.",
        variant: "destructive",
      })
      setIsConvertAlertOpen(false)
      return
    }

    setActionLoading(true)
    try {
      await apiClient.convertLead(selectedLead.id)
      toast({
        title: "Success",
        description: "Lead converted to client successfully",
        action: (
          <ToastAction altText="View Client" onClick={() => router.push('/dashboard/clients')}>
            View Client
          </ToastAction>
        ),
      })
      fetchLeads()
      setIsConvertAlertOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to convert lead",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
      setSelectedLead(null)
    }
  }

  const handleDeleteLead = async () => {
    if (!selectedLead) return
    setActionLoading(true)
    try {
      await apiClient.deleteLead(selectedLead.id)
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      })
      fetchLeads()
      setIsDeleteAlertOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
      setSelectedLead(null)
    }
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      new: "bg-secondary text-secondary-foreground",
      contacted: "bg-info/10 text-info",
      qualified: "bg-primary/10 text-primary",
      proposal: "bg-warning/10 text-warning",
      negotiation: "bg-success/10 text-success",
      closed_won: "bg-green-100 text-green-800",
      closed_lost: "bg-red-100 text-red-800",
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
            <Button onClick={() => setIsAddLeadOpen(true)}>
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
                <Button onClick={() => setIsAddLeadOpen(true)}>
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
                              <DropdownMenuItem onClick={() => handleViewLead(lead)}>
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => confirmConvertLead(lead)}
                                disabled={lead.status === 'converted'}
                              >
                                Convert to client
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => confirmDeleteLead(lead)}>
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

      <ViewLeadDialog 
        lead={selectedLead} 
        open={isViewLeadOpen} 
        onOpenChange={setIsViewLeadOpen} 
      />

      <EditLeadDialog 
        lead={selectedLead} 
        open={isEditLeadOpen} 
        onOpenChange={setIsEditLeadOpen} 
        onSuccess={fetchLeads}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead
              {selectedLead && <b> {selectedLead.first_name} {selectedLead.last_name}</b>} from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDeleteLead()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConvertAlertOpen} onOpenChange={setIsConvertAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new client record from 
              {selectedLead && <b> {selectedLead.company || `${selectedLead.first_name} ${selectedLead.last_name}`}</b>} 
              and mark this lead as "Converted".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleConvertLead()
              }}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
