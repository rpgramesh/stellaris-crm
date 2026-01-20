"use client"

import { useState } from "react"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { RoleGuard } from "@/components/role-guard"
import { AddMemberDialog } from "../team/components/add-member-dialog"

export default function SettingsPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 555-0123"
  })

  const [notifications, setNotifications] = useState({
    email: true,
    leads: true,
    tasks: true,
    invoices: false
  })

  useSupabaseRealtime<any>({
    table: "profiles",
    onUpdate: (payload) => {
      // In a real app, we would check if the update is for the current user
      setProfile(prev => ({...prev, ...payload.new}))
    }
  })

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
        </div>

        <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Invite and manage team members</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsInviteOpen(true)}>Add Member</Button>
            </CardContent>
        </Card>

          <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={profile.firstName} 
                    onChange={(e) => setProfile({...profile, firstName: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={profile.lastName} 
                    onChange={(e) => setProfile({...profile, lastName: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profile.email} 
                  onChange={(e) => setProfile({...profile, email: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={profile.phone} 
                  onChange={(e) => setProfile({...profile, phone: e.target.value})} 
                />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email updates about your activity</p>
                </div>
                <Switch 
                  checked={notifications.email} 
                  onCheckedChange={(checked) => setNotifications({...notifications, email: checked})} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lead Updates</Label>
                  <p className="text-sm text-muted-foreground">Get notified when leads change status</p>
                </div>
                <Switch 
                  checked={notifications.leads} 
                  onCheckedChange={(checked) => setNotifications({...notifications, leads: checked})} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Task Reminders</Label>
                  <p className="text-sm text-muted-foreground">Receive reminders for upcoming tasks</p>
                </div>
                <Switch 
                  checked={notifications.tasks} 
                  onCheckedChange={(checked) => setNotifications({...notifications, tasks: checked})} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Invoice Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified about invoice payments</p>
                </div>
                <Switch 
                  checked={notifications.invoices} 
                  onCheckedChange={(checked) => setNotifications({...notifications, invoices: checked})} 
                />
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>
          </div>
        </div>
        
        <AddMemberDialog 
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          onSuccess={() => {}}
        />
      </DashboardLayout>
    </RoleGuard>
  )
}
