import React, { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  FolderKanban, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  ArrowUpDown,
  X,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskFiltersProps {
  taskAssigneeFilter: string;
  setTaskAssigneeFilter: (v: any) => void;
  members: any[];
  taskProjectFilter: string;
  setTaskProjectFilter: (v: any) => void;
  taskPriorityFilter: string;
  setTaskPriorityFilter: (v: any) => void;
  taskStatusFilter: string;
  setTaskStatusFilter: (v: any) => void;
  taskDueDateFilter: string;
  setTaskDueDateFilter: (v: any) => void;
  taskSortBy: string;
  setTaskSortBy: (v: any) => void;
  taskProjects: any[];
  t: any;
}


export const TaskFilters: React.FC<TaskFiltersProps> = ({
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
  t,
  members,
}) => {
  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (taskAssigneeFilter !== 'all') count++;
    if (taskProjectFilter !== 'all') count++;
    if (taskPriorityFilter !== 'all') count++;
    if (taskStatusFilter !== 'active') count++;
    if (taskDueDateFilter !== 'all') count++;
    return count;
  }, [taskAssigneeFilter, taskProjectFilter, taskPriorityFilter, taskStatusFilter, taskDueDateFilter]);

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setTaskAssigneeFilter('all');
    setTaskProjectFilter('all');
    setTaskPriorityFilter('all');
    setTaskStatusFilter('active');
    setTaskDueDateFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho dos filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground/80">Filtros</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs px-2 py-0.5">
              {activeFiltersCount} {activeFiltersCount === 1 ? 'ativo' : 'ativos'}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Grid de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Filtro de Responsável */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Responsável
          </label>
          <Select value={taskAssigneeFilter} onValueChange={setTaskAssigneeFilter}>
            <SelectTrigger className={cn(
              "w-full hover:bg-muted/50 transition-all duration-200 border-border/60 hover:border-primary/40 h-10",
              taskAssigneeFilter !== 'all' && "border-primary/60 bg-primary/5"
            )}>
              <SelectValue placeholder={t('tasks.assignedTo')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('tasks.allTasks')}
                </div>
              </SelectItem>
              <SelectItem value="unassigned">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-orange-500" />
                  Sem responsável
                </div>
              </SelectItem>
              <SelectItem value="me">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  {t('tasks.assignedToMe')}
                </div>
              </SelectItem>
              {members && members.map((m: any) => (
                <SelectItem key={m._id} value={m._id}>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    {m.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Projeto */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            Projeto
          </label>
          <Select value={taskProjectFilter} onValueChange={setTaskProjectFilter}>
            <SelectTrigger className={cn(
              "w-full hover:bg-muted/50 transition-all duration-200 border-border/60 hover:border-primary/40 h-10",
              taskProjectFilter !== 'all' && "border-primary/60 bg-primary/5"
            )}>
              <SelectValue placeholder={t('tasks.project')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('tasks.allProjects')}
                </div>
              </SelectItem>
              {taskProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Prioridade */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Prioridade
          </label>
          <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
            <SelectTrigger className={cn(
              "w-full hover:bg-muted/50 transition-all duration-200 border-border/60 hover:border-primary/40 h-10",
              taskPriorityFilter !== 'all' && "border-primary/60 bg-primary/5"
            )}>
              <SelectValue placeholder={t('tasks.priority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('tasks.allPriorities')}
                </div>
              </SelectItem>
              <SelectItem value="urgent">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  {t('tasks.urgent')}
                </div>
              </SelectItem>
              <SelectItem value="high">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  {t('tasks.high')}
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  {t('tasks.medium')}
                </div>
              </SelectItem>
              <SelectItem value="low">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  {t('tasks.low')}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Status */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Status
          </label>
          <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
            <SelectTrigger className={cn(
              "w-full hover:bg-muted/50 transition-all duration-200 border-border/60 hover:border-primary/40 h-10",
              taskStatusFilter !== 'active' && "border-primary/60 bg-primary/5"
            )}>
              <SelectValue placeholder={t('tasks.statusFilter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  {t('tasks.activeTasks')}
                </div>
              </SelectItem>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('tasks.allStatuses')}
                </div>
              </SelectItem>
              <SelectItem value="todo">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  {t('tasks.toDo')}
                </div>
              </SelectItem>
              <SelectItem value="in-progress">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  {t('tasks.inProgress')}
                </div>
              </SelectItem>
              <SelectItem value="review">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  {t('tasks.review')}
                </div>
              </SelectItem>
              <SelectItem value="done">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  {t('tasks.done')}
                </div>
              </SelectItem>
              <SelectItem value="blocked">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-600" />
                  {t('tasks.blocked')}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Data de Vencimento */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Data de Vencimento
          </label>
          <Select value={taskDueDateFilter} onValueChange={setTaskDueDateFilter}>
            <SelectTrigger className={cn(
              "w-full hover:bg-muted/50 transition-all duration-200 border-border/60 hover:border-primary/40 h-10",
              taskDueDateFilter !== 'all' && "border-primary/60 bg-primary/5"
            )}>
              <SelectValue placeholder="Status da Tarefa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Todos os prazos
                </div>
              </SelectItem>
              <SelectItem value="overdue">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-red-500" />
                  Atrasadas
                </div>
              </SelectItem>
              <SelectItem value="onTime">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-green-500" />
                  No Prazo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Ordenação */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Ordenar por
          </label>
          <Select value={taskSortBy} onValueChange={setTaskSortBy}>
            <SelectTrigger className="w-full hover:bg-muted/50 transition-all duration-200 border-border/60 hover:border-primary/40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  {t('tasks.dueDate')}
                </div>
              </SelectItem>
              <SelectItem value="priority">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                  {t('tasks.priority')}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
