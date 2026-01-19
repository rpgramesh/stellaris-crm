"use client"

import { useState } from "react"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter, Download } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([
    {
      id: "INV-001",
      client: "Acme Corporation",
      amount: "$45,000",
      status: "Paid",
      dueDate: "2026-01-15",
      paidDate: "2026-01-10",
    },
    {
      id: "INV-002",
      client: "TechStart Inc",
      amount: "$32,000",
      status: "Pending",
      dueDate: "2026-01-20",
      paidDate: null,
    },
    {
      id: "INV-003",
      client: "Global Solutions",
      amount: "$78,000",
      status: "Overdue",
      dueDate: "2026-01-10",
      paidDate: null,
    },
    {
      id: "INV-004",
      client: "Enterprise Systems",
      amount: "$25,000",
      status: "Paid",
      dueDate: "2026-01-12",
      paidDate: "2026-01-11",
    },
    {
      id: "INV-005",
      client: "Innovation Labs",
      amount: "$18,500",
      status: "Draft",
      dueDate: "2026-01-25",
      paidDate: null,
    },
  ])

  useSupabaseRealtime<any>({
    table: "invoices",
    onInsert: (payload) => setInvoices(prev => [payload.new, ...prev]),
    onUpdate: (payload) => setInvoices(prev => prev.map(invoice => invoice.id === payload.new.id ? payload.new : invoice)),
    onDelete: (payload) => setInvoices(prev => prev.filter(invoice => invoice.id !== payload.old.id))
  })


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Paid: "bg-success/10 text-success",
      Pending: "bg-warning/10 text-warning",
      Overdue: "bg-destructive/10 text-destructive",
      Draft: "bg-secondary text-secondary-foreground",
    }
    return colors[status] || "bg-secondary"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground mt-1">Manage billing and track payments</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Invoiced</CardDescription>
              <CardTitle className="text-3xl">$198,500</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">+12.5% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Paid</CardDescription>
              <CardTitle className="text-3xl text-success">$70,000</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">2 invoices paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Outstanding</CardDescription>
              <CardTitle className="text-3xl text-warning">$128,500</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">3 pending payments</p>
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
                      <TableCell className="font-medium">{invoice.client}</TableCell>
                      <TableCell className="font-semibold">{invoice.amount}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
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
