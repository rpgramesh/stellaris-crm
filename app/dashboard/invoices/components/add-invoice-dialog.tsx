"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Price must be non-negative"),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
})

const formSchema = z.object({
  client_id: z.string({ required_error: "Please select a client" }),
  project_id: z.string().optional(),
  issue_date: z.date(),
  due_date: z.date(),
  items: z.array(itemSchema).min(1, "Add at least one item"),
  notes: z.string().optional(),
})

interface AddInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (invoice: any) => void
}

export function AddInvoiceDialog({ open, onOpenChange, onSuccess }: AddInvoiceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      issue_date: new Date(),
      due_date: new Date(new Date().setDate(new Date().getDate() + 30)),
      items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  useEffect(() => {
    if (open) {
      loadClients()
    }
  }, [open])

  const loadClients = async () => {
    try {
      const response: any = await apiClient.getClients()
      setClients(response.items || [])
    } catch (error) {
      console.error("Failed to load clients", error)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true)
      const payload = {
        ...values,
        issue_date: format(values.issue_date, "yyyy-MM-dd"),
        due_date: format(values.due_date, "yyyy-MM-dd"),
        tax_amount: 0,
        discount_amount: 0,
      }
      const invoice = await apiClient.createInvoice(payload)
      toast({
        title: "Success",
        description: "Invoice created successfully",
      })
      onSuccess(invoice)
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateTotal = () => {
    const items = form.watch("items")
    return items.reduce((acc, item) => {
      const q = Number(item.quantity) || 0
      const p = Number(item.unit_price) || 0
      return acc + (q * p)
    }, 0).toFixed(2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>Create a new invoice for a client.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                {client.company_name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="issue_date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Issue Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Items</h3>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unit_price: 0, tax_rate: 0 })}>
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                    </div>
                    
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md bg-muted/20">
                            <div className="col-span-5">
                                <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-xs">Description</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                            <div className="col-span-2">
                                <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-xs">Qty</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                            <div className="col-span-3">
                                <FormField
                                control={form.control}
                                name={`items.${index}.unit_price`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-xs">Price</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                            <div className="col-span-2 flex justify-end pb-2">
                                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-lg font-bold">Total: ${calculateTotal()}</div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Invoice
                        </Button>
                    </div>
                </div>
            </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
