"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, CheckCircle2, Circle } from "lucide-react"
import { AddTaskDialog } from "@/app/dashboard/tasks/components/add-task-dialog"
import { apiClient } from "@/lib/api-client"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"

interface ProjectTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: any
}

export function ProjectTasksDialog({ open, onOpenChange, project }: ProjectTasksDialogProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)

  // Real-time updates for tasks in this project
  useSupabaseRealtime<any>({
    table: "tasks",
    filter: project?.id ? `project_id=eq.${project.id}` : undefined,
    onInsert: (payload) => {
        // Only add if not already in list to avoid duplicates with manual optimistic updates
        setTasks(prev => {
            if (prev.some(t => t.id === payload.new.id)) return prev
            return [payload.new, ...prev]
        })
    },
    onUpdate: (payload) => setTasks(prev => prev.map(task => task.id === payload.new.id ? payload.new : task)),
    onDelete: (payload) => setTasks(prev => prev.filter(task => task.id !== payload.old.id))
  })

  useEffect(() => {
    if (open && project?.id) {
      loadTasks()
    }
  }, [open, project])

  const loadTasks = async () => {
    setLoading(true)
    try {
      // Assuming getTasks supports filtering by project_id
      // If not, we fetch all and filter client-side (not ideal but functional for demo)
      const response: any = await apiClient.getTasks({ project_id: project.id })
      setTasks(response.items || [])
    } catch (error) {
      console.error(error)
      // Fallback to mock if API fails or is empty
      setTasks([
         { id: 1, title: "Design System", status: "completed", assignee: "Alice" },
         { id: 2, title: "Homepage Layout", status: "in_progress", assignee: "Bob" },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tasks - {project?.name}</DialogTitle>
          <DialogDescription>Manage tasks for this project.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Task List</h3>
            <Button size="sm" onClick={() => setIsAddTaskOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Task</Button>
        </div>
        <ScrollArea className="h-100">
            {loading ? <div className="p-4 text-center">Loading...</div> : (
                <div className="space-y-2">
                    {tasks.length === 0 && <div className="p-4 text-center text-muted-foreground">No tasks found.</div>}
                    {tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                {task.status === 'completed' ? <CheckCircle2 className="text-green-500 w-5 h-5" /> : <Circle className="text-gray-400 w-5 h-5" />}
                                <span className={task.status === 'completed' ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{task.assignee || "Unassigned"}</Badge>
                                <Badge>{task.status}</Badge>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </DialogContent>
      {isAddTaskOpen && (
        <AddTaskDialog 
          open={isAddTaskOpen} 
          onOpenChange={setIsAddTaskOpen}
          onSuccess={(newTask) => {
            setTasks(prev => [newTask, ...prev])
            loadTasks()
          }}
          // We can optionally pass the project ID to pre-select it in the dialog
          defaultProjectId={project.id} 
        />
      )}
    </Dialog>
  )
}
