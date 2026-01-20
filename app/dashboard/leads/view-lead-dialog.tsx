"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Building2, Mail, Phone, Calendar, User, DollarSign, Globe } from "lucide-react"

interface ViewLeadDialogProps {
  lead: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewLeadDialog({ lead, open, onOpenChange }: ViewLeadDialogProps) {
  if (!lead) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl">Lead Details</DialogTitle>
            <Badge variant="outline" className="capitalize">
              {lead.status}
            </Badge>
          </div>
          <DialogDescription>
            View complete information about this lead
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Header Info */}
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h3 className="text-2xl font-semibold">{lead.company}</h3>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                {lead.first_name} {lead.last_name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Estimated Value</div>
              <div className="text-2xl font-bold text-primary">
                ${lead.estimated_value?.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Contact Info
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="hover:underline text-primary">
                    {lead.email}
                  </a>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lead.phone}`} className="hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                )}
                {lead.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={lead.website} target="_blank" rel="noreferrer" className="hover:underline">
                      Website
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Lead Info
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium w-16">Stage:</span>
                  <Badge variant="secondary" className="capitalize">
                    {lead.stage}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium w-16">Source:</span>
                  <span>{lead.source}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Created {format(new Date(lead.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes/Description if available */}
          {lead.notes && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Notes
              </h4>
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                {lead.notes}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
