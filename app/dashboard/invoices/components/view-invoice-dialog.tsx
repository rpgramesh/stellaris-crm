"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, Trash2, Edit, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
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

interface ViewInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onDeleteSuccess: (id: string) => void
  onInvoiceUpdated: () => void
}

export function ViewInvoiceDialog({ open, onOpenChange, invoice, onDeleteSuccess, onInvoiceUpdated }: ViewInvoiceDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  if (!invoice) return null

  const handleDelete = async () => {
    try {
        setLoading(true)
        await apiClient.deleteInvoice(invoice.id)
        toast({ title: "Success", description: "Invoice deleted" })
        onDeleteSuccess(invoice.id)
        setDeleteDialogOpen(false)
        onOpenChange(false)
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" })
    } finally {
        setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
      try {
          toast({ title: "Generating PDF", description: "Please wait..." })
          await apiClient.downloadInvoicePDF(invoice.id)
          toast({ title: "Success", description: "PDF downloaded successfully" })
      } catch (error) {
          toast({ title: "Error", description: "Failed to download PDF", variant: "destructive" })
      }
  }

  const handleApprove = async () => {
      try {
          setLoading(true)
          await apiClient.approveInvoice(invoice.id)
          toast({ title: "Success", description: "Invoice approved" })
          onInvoiceUpdated()
          onOpenChange(false)
      } catch (error) {
          toast({ title: "Error", description: "Failed to approve invoice", variant: "destructive" })
      } finally {
          setLoading(false)
      }
  }

  const handleSend = async () => {
      try {
          setLoading(true)
          await apiClient.sendInvoice(invoice.id)
          toast({ title: "Success", description: "Invoice sent to client" })
          onInvoiceUpdated()
          onOpenChange(false)
      } catch (error) {
          toast({ title: "Error", description: "Failed to send invoice", variant: "destructive" })
      } finally {
          setLoading(false)
      }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
                <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
                <DialogDescription>Details for invoice {invoice.invoice_number}</DialogDescription>
            </div>
            <Badge>{invoice.status}</Badge>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Client</h4>
                    <p className="font-medium">{invoice.client || "Unknown"}</p>
                </div>
                <div className="sm:text-right">
                    <h4 className="text-sm font-medium text-muted-foreground">Amount</h4>
                    <p className="text-2xl font-bold">${Number(invoice.total_amount).toLocaleString()}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Issue Date</h4>
                    <p>{invoice.issue_date || "N/A"}</p>
                </div>
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Due Date</h4>
                    <p>{invoice.due_date || "N/A"}</p>
                </div>
            </div>

            <Separator />

            <div>
                <h4 className="font-medium mb-2">Line Items</h4>
                {invoice.items && invoice.items.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="p-2 text-left">Description</th>
                                    <th className="p-2 text-right">Qty</th>
                                    <th className="p-2 text-right">Price</th>
                                    <th className="p-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item: any) => (
                                    <tr key={item.id} className="border-b last:border-0">
                                        <td className="p-2">{item.description}</td>
                                        <td className="p-2 text-right">{item.quantity}</td>
                                        <td className="p-2 text-right">${Number(item.unit_price).toLocaleString()}</td>
                                        <td className="p-2 text-right">${Number(item.amount).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-muted/20 p-4 rounded-md text-center text-muted-foreground">
                        No items found.
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                {invoice.status === 'draft' && (
                    <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Approve Invoice
                    </Button>
                )}
                {(invoice.status === 'approved' || invoice.status === 'draft') && (
                    <Button onClick={handleSend} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Send to Client
                    </Button>
                )}
                <Button variant="outline" onClick={handleDownloadPDF} disabled={loading}>
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={loading}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the invoice from the database.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
