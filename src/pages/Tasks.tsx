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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Cabeçalho moderno com gradiente sutil */}
      <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 bg-gradient-to-br from-background via-background to-primary/5 rounded-xl p-4 sm:p-6 border border-border/50 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
            <CheckSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {t('tasks.myTasks')}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">{t('tasks.projectTasksDesc')}</p>
          </div>
        </div>
        <div className="text-right bg-primary/5 rounded-lg px-4 sm:px-6 py-2 sm:py-3 border border-primary/20 self-end sm:self-auto">
          <div className="text-2xl sm:text-4xl font-bold text-primary">{filteredTasks?.length || 0}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide">Tarefas encontradas</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden rounded-xl">
        <CardHeader className="pb-4 pt-4 sm:pb-6 sm:pt-6 px-3 sm:px-6 bg-gradient-to-r from-background to-muted/20 border-b">
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
      </Card>

      <Card className="border-0 shadow-lg overflow-hidden rounded-xl">
        <CardContent className="p-0">
          {filteredTasks && filteredTasks.length > 0 ? (
            <div className="w-full bg-gradient-to-b from-background to-muted/10">
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
