"use client"

import { useState } from "react"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Search, Filter } from "lucide-react"

export default function ProjectsPage() {
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: "Website Redesign",
      client: "Acme Corporation",
      status: "In Progress",
      progress: 65,
      dueDate: "2026-02-15",
      budget: "$45,000",
    },
    {
      id: 2,
      name: "Mobile App Development",
      client: "TechStart Inc",
      status: "In Progress",
      progress: 40,
      dueDate: "2026-03-30",
      budget: "$78,000",
    },
    {
      id: 3,
      name: "CRM Integration",
      client: "Global Solutions",
      status: "Planning",
      progress: 15,
      dueDate: "2026-04-20",
      budget: "$32,000",
    },
    {
      id: 4,
      name: "Data Migration",
      client: "Enterprise Systems",
      status: "Completed",
      progress: 100,
      dueDate: "2026-01-10",
      budget: "$25,000",
    },
  ])

  useSupabaseRealtime<any>({
    table: "projects",
    onInsert: (payload) => setProjects(prev => [payload.new, ...prev]),
    onUpdate: (payload) => setProjects(prev => prev.map(project => project.id === payload.new.id ? payload.new : project)),
    onDelete: (payload) => setProjects(prev => prev.filter(project => project.id !== payload.old.id))
  })


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Planning: "bg-secondary text-secondary-foreground",
      "In Progress": "bg-primary/10 text-primary",
      "On Hold": "bg-warning/10 text-warning",
      Completed: "bg-success/10 text-success",
    }
    return colors[status] || "bg-secondary"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1">Track and manage all your client projects</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle>All Projects</CardTitle>
                <CardDescription>Overview of all active and completed projects</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search projects..." className="pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription>{project.client}</CardDescription>
                      </div>
                      <Badge variant="secondary" className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Due Date: </span>
                        <span className="font-medium">{new Date(project.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget: </span>
                        <span className="font-medium">{project.budget}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Tasks
                      </Button>
                      <Button variant="outline" size="sm">
                        Team
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
