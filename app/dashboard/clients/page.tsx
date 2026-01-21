"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Search, Filter, MoreHorizontal, Building2, Phone, Mail, Wifi, WifiOff, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddClientDialog } from "./components/add-client-dialog"
import { EditClientDialog } from "./components/edit-client-dialog"
import { ViewClientDialog } from "./components/view-client-dialog"
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
import { ToastAction } from "@/components/ui/toast"

interface Client {
  id: string
  company_name: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
  status: string
  industry?: string
  city?: string
  country?: string
  created_at: string
  address?: string
  website?: string
  meta_data?: any
}

function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isConnected, setIsConnected] = useState(true)
  const { toast } = useToast()

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const searchParams = useSearchParams()

  // Initial fetch
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsAddOpen(true)
    }
    fetchClients()
  }, [searchParams])

  // Search effect (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchClients = async (search?: string) => {
    try {
      setLoading(true)
      const data: any = await apiClient.getClients({ search, page_size: 100 })
      setClients(data.items || [])
    } catch (error) {
      console.error("Failed to fetch clients:", error)
      toast({
        title: "Error",
        description: "Failed to load clients. Please try again.",
        variant: "destructive",
      })
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Real-time updates
  useSupabaseRealtime<Client>({
    table: "clients",
    onInsert: (payload) => {
      setClients((prev) => [payload.new, ...prev])
      toast({
        title: "New Client",
        description: `${payload.new.company_name} has been added.`,
      })
    },
    onUpdate: (payload) => {
      setClients((prev) =>
        prev.map((client) => (client.id === payload.new.id ? payload.new : client))
      )
      toast({
        title: "Client Updated",
        description: `${payload.new.company_name} details have been updated.`,
      })
    },
    onDelete: (payload) => {
      setClients((prev) => prev.filter((client) => client.id !== payload.old.id))
      toast({
        title: "Client Deleted",
        description: "Client has been removed.",
      })
    },
  })

  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedClient) return

    try {
      await apiClient.deleteClient(selectedClient.id)
      // Optimistic update
      setClients(prev => prev.filter(c => c.id !== selectedClient.id))
      
      const clientToRestore = selectedClient // Capture for closure
      
      toast({
        title: "Client deleted",
        description: `${clientToRestore.company_name} has been moved to trash.`,
        action: (
          <ToastAction altText="Undo" onClick={() => handleUndoDelete(clientToRestore)}>
            Undo
          </ToastAction>
        ),
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      })
    } finally {
      setIsDeleteAlertOpen(false)
      setSelectedClient(null)
    }
  }

  const handleUndoDelete = async (client: Client) => {
    try {
      await apiClient.restoreClient(client.id)
      fetchClients() 
      toast({
        title: "Restored",
        description: "Client has been restored."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore client",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      case "churned":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "CL"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground mt-1">
              Manage your client relationships and accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "outline" : "destructive"} className="gap-1">
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? "Live Updates" : "Disconnected"}
            </Badge>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle>All Clients</CardTitle>
                <CardDescription>A complete list of your client accounts</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search clients..." 
                    className="pl-9" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && clients.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No clients found.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {clients.map((client) => (
                  <Card key={client.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarFallback>{getInitials(client.company_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base font-semibold leading-none">
                            {client.company_name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {client.primary_contact_name || "No Contact"}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setSelectedClient(client)
                            setIsViewOpen(true)
                          }}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedClient(client)
                            setIsEditOpen(true)
                          }}>Edit Client</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteClick(client)}
                          >
                            Delete Client
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Status</p>
                          <Badge variant={getStatusColor(client.status) as any}>
                            {client.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Industry</p>
                          <p className="text-sm font-medium">{client.industry || "N/A"}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                         {client.primary_contact_email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="mr-2 h-3 w-3" />
                            <span className="truncate">{client.primary_contact_email}</span>
                          </div>
                         )}
                         {client.primary_contact_phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="mr-2 h-3 w-3" />
                            <span>{client.primary_contact_phone}</span>
                          </div>
                         )}
                         {(client.city || client.country) && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Building2 className="mr-2 h-3 w-3" />
                            <span>{[client.city, client.country].filter(Boolean).join(", ")}</span>
                          </div>
                         )}
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-3">
                       <Button 
                         variant="ghost" 
                         className="w-full h-8 text-xs"
                         onClick={() => {
                           setSelectedClient(client)
                           setIsViewOpen(true)
                         }}
                       >
                         View Details
                       </Button>
                       <Button variant="ghost" className="w-full h-8 text-xs border-l rounded-none">
                         Contact
                       </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AddClientDialog 
          open={isAddOpen} 
          onOpenChange={setIsAddOpen}
          onSuccess={(newClient) => {
            // Realtime might handle this, but explicit add is safe
            if (!clients.find(c => c.id === newClient.id)) {
              setClients(prev => [newClient, ...prev])
            }
          }}
        />

        {selectedClient && (
          <>
            <EditClientDialog 
              client={selectedClient}
              open={isEditOpen}
              onOpenChange={setIsEditOpen}
              onSuccess={(updatedClient) => {
                setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c))
              }}
            />
            <ViewClientDialog 
              client={selectedClient}
              open={isViewOpen}
              onOpenChange={setIsViewOpen}
            />
          </>
        )}

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will move the client to trash. You can undo this action immediately after.
                Related projects will also be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </DashboardLayout>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientsContent />
    </Suspense>
  )
}
