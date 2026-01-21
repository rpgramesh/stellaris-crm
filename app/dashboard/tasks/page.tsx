"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AddTaskDialog } from "./components/add-task-dialog"
import { TaskBoard, Task } from "./components/task-board"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

export default function TasksPage() {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsAddTaskOpen(true)
    }
    loadTasks()
  }, [searchParams])

  const loadTasks = async () => {
    try {
      const response = await apiClient.getTasks()
      // @ts-ignore - The API returns a paginated response or list, need to check structure
      const taskList = Array.isArray(response) ? response : (response.items || [])
      setTasks(taskList)
    } catch (error) {
      console.error("Failed to load tasks:", error)
      toast.error("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  useSupabaseRealtime<Task>({
    table: "tasks",
    onInsert: (payload) => setTasks(prev => [payload.new, ...prev]),
    onUpdate: (payload) => setTasks(prev => prev.map(task => task.id === payload.new.id ? payload.new : task)),
    onDelete: (payload) => setTasks(prev => prev.filter(task => task.id !== payload.old.id))
  })

  return (
    <DashboardLayout>
      <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage your tasks with drag-and-drop</p>
          </div>
          <Button onClick={() => setIsAddTaskOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
             <TaskBoard tasks={tasks} setTasks={setTasks} />
          </div>
        )}

        <AddTaskDialog 
          open={isAddTaskOpen} 
          onOpenChange={setIsAddTaskOpen}
          onSuccess={(newTask) => {
            // Realtime subscription will handle the update, but for immediate feedback:
            setTasks(prev => {
                if (prev.some(t => t.id === newTask.id)) return prev
                return [newTask as any, ...prev]
            })
          }}
        />
      </div>
    </DashboardLayout>
  )
}

