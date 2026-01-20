"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, UserMinus, Loader2 } from "lucide-react"
import { AddProjectMemberDialog } from "./add-project-member-dialog"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface ProjectTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: any
}

export function ProjectTeamDialog({ open, onOpenChange, project }: ProjectTeamDialogProps) {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const { toast } = useToast()
  
  const fetchMembers = async () => {
    if (!project?.id) return
    
    try {
      setLoading(true)
      const data: any = await apiClient.getProjectMembers(project.id)
      setMembers(data || [])
    } catch (error) {
      console.error("Failed to fetch members:", error)
      toast({
        title: "Error",
        description: "Failed to load team members.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
     if (open && project) {
         fetchMembers()
     }
  }, [open, project])

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return

    try {
      await apiClient.removeProjectMember(project.id, userId)
      toast({
        title: "Member Removed",
        description: "User has been removed from the project.",
      })
      fetchMembers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Team - {project?.name}</DialogTitle>
          <DialogDescription>Manage team members for this project.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setIsAddMemberOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Member
            </Button>
        </div>
        <ScrollArea className="h-[300px]">
             {loading ? (
               <div className="flex justify-center py-8">
                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
               </div>
             ) : (
               <div className="space-y-4">
                  {members.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No members found.
                    </div>
                  )}
                  {members.map(member => (
                      <div key={member.user_id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                          <div className="flex items-center gap-3">
                              <Avatar>
                                  <AvatarImage src={member.user?.avatar_url} />
                                  <AvatarFallback>{member.user?.full_name?.charAt(0) || "U"}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <p className="font-medium">{member.user?.full_name || "Unknown User"}</p>
                                  <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                              </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveMember(member.user_id)}
                          >
                              <UserMinus className="w-4 h-4" />
                          </Button>
                      </div>
                  ))}
               </div>
             )}
        </ScrollArea>
        
        {project && (
          <AddProjectMemberDialog 
            open={isAddMemberOpen} 
            onOpenChange={setIsAddMemberOpen}
            projectId={project.id}
            onSuccess={() => {
              fetchMembers()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
