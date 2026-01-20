"use client"

import { useState, useEffect } from "react"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Search, Filter, Loader2, Users } from "lucide-react"
import { AddProjectDialog } from "./components/add-project-dialog"
import { ProjectTasksDialog } from "./components/project-tasks-dialog"
import { ProjectTeamDialog } from "./components/project-team-dialog"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface Project {
  id: string
  name: string
  description?: string
  client_id: string
  status: string
  priority: string
  start_date?: string
  end_date?: string
  budget?: number
  actual_cost?: number
  progress?: number
}

export default function ProjectsPage() {
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false)
  const [isTasksOpen, setIsTasksOpen] = useState(false)
  const [isTeamOpen, setIsTeamOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const data: any = await apiClient.getProjects({ page_size: 100 })
      setProjects(data.items || [])
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      toast({
        title: "Error",
        description: "Failed to load projects.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  useSupabaseRealtime<Project>({
    table: "projects",
    onInsert: (payload) => setProjects(prev => [payload.new, ...prev]),
    onUpdate: (payload) => setProjects(prev => prev.map(project => project.id === payload.new.id ? payload.new : project)),
    onDelete: (payload) => setProjects(prev => prev.filter(project => project.id !== payload.old.id))
  })


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: "bg-secondary text-secondary-foreground",
      in_progress: "bg-primary/10 text-primary",
      on_hold: "bg-warning/10 text-warning",
      completed: "bg-success/10 text-success",
      cancelled: "bg-destructive/10 text-destructive",
    }
    return colors[status] || "bg-secondary"
  }

  const handleTeamClick = (project: Project) => {
    setSelectedProject(project)
    setIsTeamOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1">Track and manage all your client projects</p>
          </div>
          <Button onClick={() => setIsAddProjectOpen(true)}>
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
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No projects found. Create one to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{project.name}</h3>
                        <Badge variant="secondary" className={getStatusColor(project.status)}>
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{project.description || "No description"}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>Due: {project.end_date || "N/A"}</span>
                        <span>Budget: ${project.budget?.toLocaleString() || "0"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="flex-1 sm:w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{project.progress || 0}%</span>
                        </div>
                        <Progress value={project.progress || 0} className="h-2" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleTeamClick(project)}>
                            <Users className="h-4 w-4 mr-2" />
                            Team
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedProject(project)
                          setIsTasksOpen(true)
                        }}>
                          Tasks
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AddProjectDialog 
          open={isAddProjectOpen} 
          onOpenChange={setIsAddProjectOpen}
          onSuccess={fetchProjects}
        />
        
        {selectedProject && (
          <>
            <ProjectTasksDialog 
              open={isTasksOpen} 
              onOpenChange={setIsTasksOpen}
              project={selectedProject}
            />
            <ProjectTeamDialog
              open={isTeamOpen}
              onOpenChange={setIsTeamOpen}
              project={selectedProject}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
