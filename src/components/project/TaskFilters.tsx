import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
    <Select value={taskAssigneeFilter} onValueChange={setTaskAssigneeFilter}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t('tasks.assignedTo')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('tasks.allTasks')}</SelectItem>
        <SelectItem value="unassigned">Sem responsável</SelectItem>
        <SelectItem value="me">{t('tasks.assignedToMe')}</SelectItem>
        {members && members.map((m: any) => (
          <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={taskProjectFilter} onValueChange={setTaskProjectFilter}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t('tasks.project')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('tasks.allProjects')}</SelectItem>
        {taskProjects.map((project) => (
          <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t('tasks.priority')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
        <SelectItem value="urgent">{t('tasks.urgent')}</SelectItem>
        <SelectItem value="high">{t('tasks.high')}</SelectItem>
        <SelectItem value="medium">{t('tasks.medium')}</SelectItem>
        <SelectItem value="low">{t('tasks.low')}</SelectItem>
      </SelectContent>
    </Select>
    <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t('tasks.statusFilter')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">{t('tasks.activeTasks')}</SelectItem>
        <SelectItem value="all">{t('tasks.allStatuses')}</SelectItem>
        <SelectItem value="todo">{t('tasks.toDo')}</SelectItem>
        <SelectItem value="in-progress">{t('tasks.inProgress')}</SelectItem>
        <SelectItem value="review">{t('tasks.review')}</SelectItem>
        <SelectItem value="done">{t('tasks.done')}</SelectItem>
        <SelectItem value="blocked">{t('tasks.blocked')}</SelectItem>
      </SelectContent>
    </Select>
    <Select value={taskDueDateFilter} onValueChange={setTaskDueDateFilter}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Status da Tarefa" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="overdue">Atrasadas</SelectItem>
        <SelectItem value="onTime">No Prazo</SelectItem>
      </SelectContent>
    </Select>
    <Select value={taskSortBy} onValueChange={setTaskSortBy}>
      <SelectTrigger className="w-full">
        <span>{t('tasks.sortBy')}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="dueDate">{t('tasks.dueDate')}</SelectItem>
        <SelectItem value="priority">{t('tasks.priority')}</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
