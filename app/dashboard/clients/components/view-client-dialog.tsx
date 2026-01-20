"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Download, Printer, FileText, Clock, AlertCircle, Plus } from "lucide-react"
import { AddProjectDialog } from "../../projects/components/add-project-dialog"

interface ViewClientDialogProps {
  client: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewClientDialog({ client, open, onOpenChange }: ViewClientDialogProps) {
  const [projects, setProjects] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false)

  useEffect(() => {
    if (client && open) {
      fetchProjects()
    }
  }, [client, open])

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      const data: any = await apiClient.getClientProjects(client.id)
      setProjects(data.projects || [])
    } catch (error) {
      console.error("Failed to fetch projects", error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    if (!client) return

    // Create CSV content
    const headers = ["Field", "Value"]
    const rows = [
      ["Company Name", client.company_name],
      ["Industry", client.industry || ""],
      ["Status", client.status],
      ["Primary Contact", client.primary_contact_name || ""],
      ["Email", client.primary_contact_email || ""],
      ["Phone", client.primary_contact_phone || ""],
      ["Website", client.website || ""],
      ["Address", client.address || ""],
      ["City", client.city || ""],
      ["Country", client.country || ""],
      ["Created At", new Date(client.created_at).toLocaleString()],
    ]

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${client.company_name.replace(/\s+/g, '_')}_details.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">{client.company_name}</DialogTitle>
              <DialogDescription className="mt-1">
                {client.industry ? `${client.industry} • ` : ''}{client.city ? `${client.city}, ` : ''}{client.country || 'No location'}
              </DialogDescription>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="print:hidden">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-auto mt-4 p-1">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="font-semibold block text-xs text-muted-foreground uppercase">Name</span>
                      {client.primary_contact_name || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold block text-xs text-muted-foreground uppercase">Email</span>
                      {client.primary_contact_email || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold block text-xs text-muted-foreground uppercase">Phone</span>
                      {client.primary_contact_phone || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold block text-xs text-muted-foreground uppercase">Website</span>
                      {client.website ? (
                        <a href={client.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {client.website}
                        </a>
                      ) : "N/A"}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Account Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold block text-xs text-muted-foreground uppercase">Current Status</span>
                      <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                        {client.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-semibold block text-xs text-muted-foreground uppercase">Created On</span>
                      {new Date(client.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-semibold block text-xs text-muted-foreground uppercase">Address</span>
                      {client.address || "N/A"}
                      {client.city && `, ${client.city}`}
                      {client.state && `, ${client.state}`}
                      {client.postal_code && ` ${client.postal_code}`}
                      {client.country && `, ${client.country}`}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="grid grid-cols-3 gap-4 text-center">
                     <div>
                       <div className="text-2xl font-bold">$0.00</div>
                       <div className="text-xs text-muted-foreground">Total Revenue</div>
                     </div>
                     <div>
                       <div className="text-2xl font-bold">0</div>
                       <div className="text-xs text-muted-foreground">Open Invoices</div>
                     </div>
                     <div>
                       <div className="text-2xl font-bold text-muted-foreground">-</div>
                       <div className="text-xs text-muted-foreground">Payment Status</div>
                     </div>
                   </div>
                   <div className="mt-4 text-xs text-center text-muted-foreground">
                     * Financial data integration pending invoice module
                   </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-medium">Projects</h3>
                 <Button size="sm" onClick={() => setIsAddProjectOpen(true)}>
                   <Plus className="h-4 w-4 mr-2" /> New Project
                 </Button>
              </div>
              {loadingProjects ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <FileText className="h-8 w-8 mb-2 opacity-50" />
                  <p>No projects found for this client.</p>
                  <Button variant="link" className="mt-2" onClick={() => setIsAddProjectOpen(true)}>Create one now</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((project: any) => (
                    <Card key={project.id}>
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{project.name}</div>
                          <div className="text-sm text-muted-foreground">{project.description}</div>
                        </div>
                        <Badge variant="outline">{project.status}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="space-y-4 relative pl-4 border-l-2 border-muted ml-2">
                 {/* Audit Logs */}
                 {client.meta_data?.audit_log?.slice().reverse().map((log: any, i: number) => (
                    <div key={i} className="mb-6 relative">
                      <span className="absolute -left-[21px] top-0 bg-background p-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <div className="font-medium text-sm">
                        {log.action === 'restore' ? 'Client Restored' : 'Client Updated'}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                         {log.changes ? (
                           <ul className="list-disc list-inside">
                             {Object.entries(log.changes).map(([key, val]: [string, any]) => (
                               <li key={key}>
                                 <span className="font-medium">{key.replace('_', ' ')}</span>: {val}
                               </li>
                             ))}
                           </ul>
                         ) : (
                           "Restored from trash"
                         )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(log.timestamp).toLocaleString()} by {log.user_id}
                      </div>
                    </div>
                 ))}
                 
                 {/* Creation Log */}
                 <div className="relative">
                   <span className="absolute -left-[21px] top-0 bg-background p-1">
                     <Clock className="h-4 w-4 text-muted-foreground" />
                   </span>
                   <div className="font-medium text-sm">Client Created</div>
                   <div className="text-sm text-muted-foreground mt-1">Account created</div>
                   <div className="text-xs text-muted-foreground mt-1">
                     {new Date(client.created_at).toLocaleString()}
                   </div>
                 </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
               <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-lg">
                 <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                 <p>No documents uploaded yet.</p>
                 <Button variant="link" className="mt-2">Upload Document</Button>
               </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <AddProjectDialog 
          open={isAddProjectOpen}
          onOpenChange={setIsAddProjectOpen}
          preselectedClientId={client.id}
          onSuccess={() => {
            fetchProjects()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
