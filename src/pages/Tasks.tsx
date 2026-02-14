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
    <div className="space-y-6 p-1">
      {/* Cabeçalho moderno com gradiente sutil */}
      <div className="flex items-start justify-between bg-gradient-to-br from-background via-background to-primary/5 rounded-xl p-6 border border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <CheckSquare className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {t('tasks.myTasks')}
            </h2>
            <p className="text-muted-foreground text-base">{t('tasks.projectTasksDesc')}</p>
          </div>
        </div>
        <div className="text-right bg-primary/5 rounded-lg px-6 py-3 border border-primary/20">
          <div className="text-4xl font-bold text-primary">{filteredTasks?.length || 0}</div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tarefas encontradas</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden rounded-xl">
        <CardHeader className="pb-6 pt-6 bg-gradient-to-r from-background to-muted/20 border-b">
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
        </CardHeader>
        <CardContent className="p-0">
          {filteredTasks && filteredTasks.length > 0 ? (
            <div className="w-full overflow-x-auto bg-gradient-to-b from-background to-muted/10">
              <TaskTable
                filteredTasks={filteredTasks}
                t={t}
              />
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground bg-gradient-to-b from-background to-muted/20">
              <div className="max-w-md mx-auto">
                <div className="mb-6 inline-block p-4 bg-muted/30 rounded-full">
                  <CheckSquare className="h-16 w-16 opacity-50" />
                </div>
                <p className="text-xl font-semibold mb-2 text-foreground/80">{t('tasks.noTasksAssigned')}</p>
                <p className="text-sm text-muted-foreground/80">Nenhuma tarefa encontrada com os filtros selecionados</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
