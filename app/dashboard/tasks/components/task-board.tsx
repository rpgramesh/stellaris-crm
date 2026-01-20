import { useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove } from "@dnd-kit/sortable"
import { TaskColumn } from "./task-column"
import { TaskCard } from "./task-card"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

export interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date?: string
  assigned_to?: string
  project_id?: string
  [key: string]: any
}

interface TaskBoardProps {
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
}

export function TaskBoard({ tasks, setTasks }: TaskBoardProps) {
  const columns = useMemo(
    () => [
      { id: "todo", title: "To Do" },
      { id: "in_progress", title: "In Progress" },
      { id: "review", title: "Review" },
      { id: "completed", title: "Completed" },
    ],
    []
  )

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns])

  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // 3px movement required to start drag
      },
    })
  )

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Task") {
      setActiveTask(event.active.data.current.task)
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    
    // Store reference to the active task from state (before clearing it)
    // We use this to compare original status
    const originalTask = activeTask
    
    setActiveTask(null)

    if (!over) return

    const activeId = active.id
    const overId = over.id

    const isActiveTask = active.data.current?.type === "Task"
    const isOverColumn = over.data.current?.type === "Column"
    const isOverTask = over.data.current?.type === "Task"

    if (isActiveTask && originalTask) {
        let newStatus = originalTask.status

        if (isOverColumn) {
            newStatus = overId as string
        } else if (isOverTask) {
             const overTask = tasks.find(t => t.id === overId)
             if (overTask) {
                 newStatus = overTask.status
             }
        }

        if (newStatus !== originalTask.status) {
            // Optimistic update
            const updatedTasks = tasks.map(t => 
                t.id === activeId ? { ...t, status: newStatus } : t
            )
            setTasks(updatedTasks)

            // API Call
            try {
                await apiClient.updateTask(activeId as string, { status: newStatus })
                toast.success("Task status updated")
            } catch (error) {
                console.error("Failed to update task status:", error)
                toast.error("Failed to update task status")
                // Revert
                setTasks(tasks) 
            }
        }
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === "Task"
    const isOverTask = over.data.current?.type === "Task"

    if (!isActiveTask) return

    // I'm dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId)
        const overIndex = tasks.findIndex((t) => t.id === overId)

        if (tasks[activeIndex].status !== tasks[overIndex].status) {
          const newStatus = tasks[overIndex].status
          const updatedTasks = [...tasks]
          // Create new object to avoid mutation
          updatedTasks[activeIndex] = { ...updatedTasks[activeIndex], status: newStatus }
          return arrayMove(updatedTasks, activeIndex, overIndex - 1)
        }

        return arrayMove(tasks, activeIndex, overIndex)
      })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {columns.map((col) => (
          <TaskColumn
            key={col.id}
            column={col}
            tasks={tasks.filter((task) => task.status === col.id)}
          />
        ))}
      </div>

      {typeof document !== "undefined" && (
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} />}
        </DragOverlay>
      )}
    </DndContext>
  )
}
