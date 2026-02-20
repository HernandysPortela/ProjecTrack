import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle2, Circle, Clock, AlertCircle, MoreVertical, ChevronRight, ChevronDown, Trash2, Edit } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";
import { TaskDependencyIndicator } from "@/components/TaskDependencyIndicator";

interface TaskCardProps {
  task: any;
  subtasks: any[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onTaskClick: (task: any) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: Id<"tasks">) => void;
  getStatusIcon: (status: string) => JSX.Element;
  getPriorityColor: (priority: string) => string;
  members: any[];
}

export function TaskCard({
  task,
  subtasks,
  expandedTasks,
  onToggleExpand,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  getStatusIcon,
  getPriorityColor,
  members,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasSubtasks = subtasks.length > 0;
  const isExpanded = expandedTasks.has(task._id);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-2 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {hasSubtasks && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={() => onToggleExpand(task._id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              <div
                {...attributes}
                {...listeners}
                className="flex-1 min-w-0 cursor-move"
                onClick={() => onTaskClick(task)}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(task.status)}
                  <h4 className="font-medium truncate">{task.title}</h4>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  {task.assigneeId && (
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {members.find(m => m._id === task.assigneeId)?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {task.dueDate && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </Badge>
                  )}
                  <TaskDependencyIndicator taskId={task._id} />
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditTask(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteTask(task._id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {hasSubtasks && isExpanded && (
        <div className="ml-8 mt-2 space-y-2">
          {subtasks.map((subtask) => (
            <Card key={subtask._id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onTaskClick(subtask)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(subtask.status)}
                      <h5 className="text-sm font-medium truncate">{subtask.title}</h5>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(subtask.priority)}`}>
                        {subtask.priority}
                      </Badge>
                      {subtask.assigneeId && (
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-xs">
                            {members.find(m => m._id === subtask.assigneeId)?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditTask(subtask)}>
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteTask(subtask._id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
