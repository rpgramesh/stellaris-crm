"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, Trash2, Edit } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface ViewInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onDeleteSuccess: (id: string) => void
}

export function ViewInvoiceDialog({ open, onOpenChange, invoice, onDeleteSuccess }: ViewInvoiceDialogProps) {
  const { toast } = useToast()

  if (!invoice) return null

  const handleDelete = async () => {
      if (confirm("Are you sure you want to delete this invoice?")) {
        try {
            await apiClient.deleteInvoice(invoice.id)
            toast({ title: "Success", description: "Invoice deleted" })
            onDeleteSuccess(invoice.id)
            onOpenChange(false)
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" })
        }
      }
  }

  const handleDownloadPDF = () => {
      toast({ title: "Generating PDF", description: "This feature is coming soon." })
  }

  const handleApprove = async () => {
      try {
          await apiClient.approveInvoice(invoice.id)
          toast({ title: "Success", description: "Invoice approved" })
          onOpenChange(false)
          // Trigger reload in parent if needed, or rely on realtime
      } catch (error) {
          toast({ title: "Error", description: "Failed to approve invoice", variant: "destructive" })
      }
  }

  const handleSend = async () => {
      try {
          await apiClient.sendInvoice(invoice.id)
          toast({ title: "Success", description: "Invoice sent to client" })
          onOpenChange(false)
      } catch (error) {
          toast({ title: "Error", description: "Failed to send invoice", variant: "destructive" })
      }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
                <DialogTitle>Invoice {invoice.id}</DialogTitle>
                <DialogDescription>Details for invoice {invoice.id}</DialogDescription>
            </div>
            <Badge>{invoice.status}</Badge>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Client</h4>
                    <p className="font-medium">{invoice.client}</p>
                </div>
                <div className="text-right">
                    <h4 className="text-sm font-medium text-muted-foreground">Amount</h4>
                    <p className="text-2xl font-bold">{invoice.amount}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Issue Date</h4>
                    <p>{invoice.created || "N/A"}</p>
                </div>
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Due Date</h4>
                    <p>{invoice.dueDate}</p>
                </div>
            </div>

            <Separator />

            <div>
                <h4 className="font-medium mb-2">Line Items</h4>
                <div className="bg-muted/20 p-4 rounded-md text-center text-muted-foreground">
                    Items data would appear here if fetched from API details.
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                {invoice.status === 'draft' && (
                    <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                        Approve Invoice
                    </Button>
                )}
                {(invoice.status === 'approved' || invoice.status === 'draft') && (
                    <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700">
                        Send to Client
                    </Button>
                )}
                <Button variant="outline" onClick={handleDownloadPDF}>
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
