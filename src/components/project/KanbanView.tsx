import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

interface KanbanViewProps {
  tasks: any[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onTaskClick: (task: any) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: Id<"tasks">) => void;
  onDragEnd: (event: DragEndEvent) => void;
  getStatusIcon: (status: string) => JSX.Element;
  getPriorityColor: (priority: string) => string;
  members: any[];
}

const KANBAN_COLUMNS = [
  { id: "To Do", title: "A Fazer", color: "bg-slate-100" },
  { id: "In Progress", title: "Em Progresso", color: "bg-blue-100" },
  { id: "Review", title: "Revisão", color: "bg-yellow-100" },
  { id: "Done", title: "Concluído", color: "bg-green-100" },
  { id: "Blocked", title: "Bloqueado", color: "bg-red-100" },
];

export function KanbanView({
  tasks,
  expandedTasks,
  onToggleExpand,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  onDragEnd,
  getStatusIcon,
  getPriorityColor,
  members,
}: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    onDragEnd(event);
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => !task.parentTaskId && task.status === status);
  };

  const getSubtasks = (parentId: string) => {
    return tasks.filter((task) => task.parentTaskId === parentId);
  };

  const activeTask = activeId ? tasks.find((t) => t._id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <Card key={column.id} className={`${column.color} border-2`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  {column.title}
                  <Badge variant="secondary" className="ml-2">
                    {columnTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <SortableContext
                  items={columnTasks.map((t) => t._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      subtasks={getSubtasks(task._id)}
                      expandedTasks={expandedTasks}
                      onToggleExpand={onToggleExpand}
                      onTaskClick={onTaskClick}
                      onEditTask={onEditTask}
                      onDeleteTask={onDeleteTask}
                      getStatusIcon={getStatusIcon}
                      getPriorityColor={getPriorityColor}
                      members={members}
                    />
                  ))}
                </SortableContext>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <Card className="shadow-lg opacity-90">
            <CardContent className="p-4">
              <h4 className="font-medium">{activeTask.title}</h4>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
