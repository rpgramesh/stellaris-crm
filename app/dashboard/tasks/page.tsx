"use client"

import { useState } from "react"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar } from "lucide-react"

export default function TasksPage() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Review design mockups for Acme",
      priority: "High",
      dueDate: "Today",
      completed: false,
      project: "Website Redesign",
    },
    {
      id: 2,
      title: "Client meeting preparation",
      priority: "High",
      dueDate: "Today",
      completed: false,
      project: "Mobile App",
    },
    {
      id: 3,
      title: "Update project timeline",
      priority: "Medium",
      dueDate: "Tomorrow",
      completed: false,
      project: "CRM Integration",
    },
    {
      id: 4,
      title: "Send invoice to TechStart",
      priority: "Medium",
      dueDate: "Tomorrow",
      completed: true,
      project: "Mobile App",
    },
    {
      id: 5,
      title: "Code review for API endpoints",
      priority: "Low",
      dueDate: "Jan 18",
      completed: false,
      project: "Data Migration",
    },
    {
      id: 6,
      title: "Documentation update",
      priority: "Low",
      dueDate: "Jan 20",
      completed: false,
      project: "Website Redesign",
    },
  ])

  useSupabaseRealtime<any>({
    table: "tasks",
    onInsert: (payload) => setTasks(prev => [payload.new, ...prev]),
    onUpdate: (payload) => setTasks(prev => prev.map(task => task.id === payload.new.id ? payload.new : task)),
    onDelete: (payload) => setTasks(prev => prev.filter(task => task.id !== payload.old.id))
  })


  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: "bg-destructive/10 text-destructive",
      Medium: "bg-warning/10 text-warning",
      Low: "bg-success/10 text-success",
    }
    return colors[priority] || "bg-secondary"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage your tasks and to-do list</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {["Today", "Tomorrow", "Upcoming"].map((section) => {
            const sectionTasks = tasks.filter((task) => {
              if (section === "Today") return task.dueDate === "Today"
              if (section === "Tomorrow") return task.dueDate === "Tomorrow"
              return task.dueDate !== "Today" && task.dueDate !== "Tomorrow"
            })

            return (
              <Card key={section} className="p-6">
                <h3 className="font-semibold text-lg mb-4">{section}</h3>
                <div className="space-y-3">
                  {sectionTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <Checkbox checked={task.completed} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm mb-1 ${task.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">{task.project}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`${getPriorityColor(task.priority)} text-xs`}>
                            {task.priority}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {task.dueDate}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
