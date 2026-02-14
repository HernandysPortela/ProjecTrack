import * as React from "react";
import { CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TaskFilters } from "@/components/project/TaskFilters";
import { TaskTable } from "@/components/project/TaskTable";
import { Id } from "@convex/_generated/dataModel";

interface Props {
  filteredTasks: any[];
  t: any;
  navigate: any;
  setSelectedTaskForDetails: (v: { id: Id<"tasks">; projectId: Id<"projects"> } | null) => void;
  taskAssigneeFilter: "all" | "me";
  setTaskAssigneeFilter: (s: "all" | "me") => void;
  taskProjectFilter: string;
  setTaskProjectFilter: (s: string) => void;
  taskPriorityFilter: any;
  setTaskPriorityFilter: any;
  taskStatusFilter: any;
  setTaskStatusFilter: any;
  taskDueDateFilter: any;
  setTaskDueDateFilter: any;
  taskSortBy: any;
  setTaskSortBy: any;
  taskProjects: any[];
  members: any[];
}

export default function TasksPage(props: Props) {
  const {
    filteredTasks,
    t,
    navigate,
    setSelectedTaskForDetails,
    taskAssigneeFilter,
    setTaskAssigneeFilter,
    taskProjectFilter,
    setTaskProjectFilter,
    taskPriorityFilter,
    setTaskPriorityFilter,
    taskStatusFilter,
    setTaskStatusFilter,
    taskDueDateFilter,
    setTaskDueDateFilter,
    taskSortBy,
    setTaskSortBy,
    taskProjects,
    members,
  } = props;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">{t('tasks.myTasks')}</h2>
          <p className="text-muted-foreground text-lg">{t('tasks.projectTasksDesc')}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">{filteredTasks?.length || 0}</div>
          <p className="text-sm text-muted-foreground">Tarefas encontradas</p>
        </div>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4 border-b">
          <div className="space-y-4">
            <TaskFilters
              taskAssigneeFilter={taskAssigneeFilter}
              setTaskAssigneeFilter={setTaskAssigneeFilter}
              taskProjectFilter={taskProjectFilter}
              setTaskProjectFilter={setTaskProjectFilter}
              taskPriorityFilter={taskPriorityFilter}
              setTaskPriorityFilter={setTaskPriorityFilter}
              taskStatusFilter={taskStatusFilter}
              setTaskStatusFilter={setTaskStatusFilter}
              taskDueDateFilter={taskDueDateFilter}
              setTaskDueDateFilter={setTaskDueDateFilter}
              taskSortBy={taskSortBy}
              setTaskSortBy={setTaskSortBy}
              taskProjects={taskProjects}
              t={t}
              members={members}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTasks && filteredTasks.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <TaskTable
                filteredTasks={filteredTasks}
                t={t}
                navigate={navigate}
                onTaskClick={(task) => setSelectedTaskForDetails({ id: task._id, projectId: task.projectId })}
              />
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <CheckSquare className="h-16 w-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium mb-1">{t('tasks.noTasksAssigned')}</p>
              <p className="text-sm">Nenhuma tarefa encontrada com os filtros selecionados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
