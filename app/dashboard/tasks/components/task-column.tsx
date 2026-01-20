import { SortableContext, useSortable } from "@dnd-kit/sortable"
import { Task } from "./task-board"
import { TaskCard } from "./task-card"
import { useMemo } from "react"
import { CSS } from "@dnd-kit/utilities"

interface TaskColumnProps {
  column: {
    id: string
    title: string
  }
  tasks: Task[]
}

export function TaskColumn({ column, tasks }: TaskColumnProps) {
  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks])

  const { setNodeRef, transform, transition } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-secondary/30 rounded-lg p-4 flex flex-col gap-4 min-h-125 w-full"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{column.title}</h3>
        <span className="text-sm text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      
      <SortableContext items={taskIds}>
        <div className="flex flex-col gap-3 flex-1">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
