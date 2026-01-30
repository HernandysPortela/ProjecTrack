import { TaskCard } from "./TaskCard";
import { Id } from "@/convex/_generated/dataModel";

interface ListViewProps {
  tasks: any[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onTaskClick: (task: any) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: Id<"tasks">) => void;
  getStatusIcon: (status: string) => JSX.Element;
  getPriorityColor: (priority: string) => string;
  members: any[];
}

export function ListView({
  tasks,
  expandedTasks,
  onToggleExpand,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  getStatusIcon,
  getPriorityColor,
  members,
}: ListViewProps) {
  const parentTasks = tasks.filter((task) => !task.parentTaskId);
  
  const getSubtasks = (parentId: string) => {
    return tasks.filter((task) => task.parentTaskId === parentId);
  };

  return (
    <div className="space-y-2">
      {parentTasks.map((task) => (
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
    </div>
  );
}
