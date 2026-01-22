"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter, Download } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AddInvoiceDialog } from "./components/add-invoice-dialog"
import { ViewInvoiceDialog } from "./components/view-invoice-dialog"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

function InvoicesContent() {
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false)
  const [isViewInvoiceOpen, setIsViewInvoiceOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Record<string, string>>({})
  const [stats, setStats] = useState<any>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsAddInvoiceOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [invoicesRes, clientsRes, statsRes] = await Promise.all([
        apiClient.getInvoices(),
        apiClient.getClients(),
        apiClient.getDashboardStats()
      ])

      const invoiceList = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes.items || [])
      setInvoices(invoiceList)

      const clientMap: Record<string, string> = {}
      const clientList = Array.isArray(clientsRes) ? clientsRes : (clientsRes.items || [])
      clientList.forEach((c: any) => clientMap[c.id] = c.company_name)
      setClients(clientMap)

      setStats(statsRes)

    } catch (error) {
      console.error("Failed to load invoice data:", error)
      toast.error("Failed to load invoice data")
    } finally {
      setLoading(false)
    }
  }

  useSupabaseRealtime<any>({
    table: "invoices",
    onInsert: (payload) => setInvoices(prev => [payload.new, ...prev]),
    onUpdate: (payload) => setInvoices(prev => prev.map(invoice => invoice.id === payload.new.id ? payload.new : invoice)),
    onDelete: (payload) => setInvoices(prev => prev.filter(invoice => invoice.id !== payload.old.id))
  })


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: "bg-success/10 text-success",
      pending: "bg-warning/10 text-warning",
      overdue: "bg-destructive/10 text-destructive",
      draft: "bg-secondary text-secondary-foreground",
      sent: "bg-primary/10 text-primary"
    }
    return colors[status?.toLowerCase()] || "bg-secondary"
  }

  const handleExport = () => {
    // Simple CSV Export
    const headers = ["Invoice Number", "Client", "Amount", "Status", "Issue Date", "Due Date"]
    const rows = invoices.map(inv => [
        inv.invoice_number,
        clients[inv.client_id] || "Unknown",
        inv.total_amount,
        inv.status,
        inv.issue_date,
        inv.due_date
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "invoices.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground mt-1">Manage billing and track payments</p>
          </div>
          <Button onClick={() => setIsAddInvoiceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Revenue This Month</CardDescription>
              <CardTitle className="text-3xl">${stats?.financial?.revenue_this_month?.toLocaleString() || "0"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                  {stats?.financial?.revenue_growth_percent > 0 ? "+" : ""}
                  {stats?.financial?.revenue_growth_percent || 0}% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Outstanding Amount</CardDescription>
              <CardTitle className="text-3xl text-warning">${stats?.financial?.outstanding_amount?.toLocaleString() || "0"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Pending payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Overdue Invoices</CardDescription>
              <CardTitle className="text-3xl text-destructive">{stats?.financial?.overdue_invoices || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Action required</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>Manage and track all your invoices</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search invoices..." className="pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleExport} title="Export to CSV">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => toast.info("Syncing with Accounting System...")} title="Sync with Accounting System">
                   Sync
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
             {loading ? (
                 <div className="text-center py-4">Loading invoices...</div>
             ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={7} className="text-center">No invoices found</TableCell>
                      </TableRow>
                  ) : invoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedInvoice({
                          ...invoice,
                          client: clients[invoice.client_id] || "Unknown"
                        })
                        setIsViewInvoiceOpen(true)
                      }}
                    >
                      <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell className="font-medium">{clients[invoice.client_id] || "Unknown"}</TableCell>
                      <TableCell className="font-semibold">${Number(invoice.total_amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        ${Number(invoice.amount_paid).toLocaleString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
             )}
          </CardContent>
        </Card>

        <AddInvoiceDialog 
          open={isAddInvoiceOpen}
          onOpenChange={setIsAddInvoiceOpen}
          onSuccess={(newInvoice) => {
             // Add to list with some defaults for missing fields in response
             setInvoices(prev => [{
                ...newInvoice,
             }, ...prev])
             loadData()
          }}
        />

        <ViewInvoiceDialog
          open={isViewInvoiceOpen}
          onOpenChange={setIsViewInvoiceOpen}
          invoice={selectedInvoice}
          onDeleteSuccess={(id) => {
             setInvoices(prev => prev.filter(inv => inv.id !== id))
             setSelectedInvoice(null)
          }}
          onInvoiceUpdated={loadData}
        />
      </div>
    </DashboardLayout>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InvoicesContent />
    </Suspense>
  )
}

