import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User } from "lucide-react"
import { Task } from "./task-board"

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-destructive/10 text-destructive",
      medium: "bg-warning/10 text-warning",
      low: "bg-success/10 text-success",
    }
    return colors[priority?.toLowerCase()] || "bg-secondary"
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-primary/10 h-[150px] rounded-lg border-2 border-primary border-dashed"
      />
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
            <Badge variant="secondary" className={`${getPriorityColor(task.priority)} text-[10px] px-1.5 py-0`}>
              {task.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{task.assigned_to ? "Assigned" : "Unassigned"}</span>
            </div>
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
