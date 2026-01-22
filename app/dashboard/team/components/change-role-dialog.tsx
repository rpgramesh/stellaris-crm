"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  role_id: z.string().min(1, "Please select a role"),
})

interface Role {
  id: string
  name: string
  description?: string
}

interface User {
  id: string
  full_name: string
  email: string
  role?: Role
}

interface ChangeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onSuccess: () => void
}

export function ChangeRoleDialog({ open, onOpenChange, user, onSuccess }: ChangeRoleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role_id: "",
    },
  })

  // Fetch roles when dialog opens
  useEffect(() => {
    if (open) {
      const fetchRoles = async () => {
        try {
          const data: any = await apiClient.getRoles()
          setRoles(data || [])
        } catch (error) {
          console.error("Failed to fetch roles:", error)
          toast({
            title: "Error",
            description: "Failed to load roles.",
            variant: "destructive",
          })
        }
      }
      fetchRoles()
    }
  }, [open, toast])

  // Update form default value when user changes
  useEffect(() => {
    if (user && user.role) {
      form.reset({
        role_id: user.role.id,
      })
    } else {
      form.reset({
        role_id: "",
      })
    }
  }, [user, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return

    try {
      setLoading(true)
      await apiClient.updateUser(user.id, { role_id: values.role_id })
      
      toast({
        title: "Role Updated",
        description: `Role for ${user.full_name} has been updated.`,
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Update the role for {user?.full_name}. This will affect their permissions in the system.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <span className="capitalize">{role.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Role
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
