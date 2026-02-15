import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskTableProps {
  filteredTasks: any[];
  t: (key: string) => string;
}

type EditingCell = {
  taskId: Id<"tasks">;
  field: 'status' | 'priority' | 'dueDate' | 'assignee';
  projectId?: Id<"projects">;
};

export function TaskTable({ filteredTasks, t }: TaskTableProps) {
  if (!filteredTasks || filteredTasks.length === 0) return null;

  const updateTask = useMutation(api.tasks.update);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  
  // Fetch assignable users for the project being edited
  const projectMembers = useQuery(
    api.projectMembers.getAssignableUsers,
    editingCell?.projectId ? { projectId: editingCell.projectId } : "skip"
  );

  // Handle saving edited cell
  const handleSaveCell = async (taskId: Id<"tasks">, field: string, value: any) => {
    if (value === null || value === undefined) return;
    
    try {
      const patch: any = {};
      
      if (field === 'status') {
        patch.status = value;
      } else if (field === 'priority') {
        patch.priority = value;
      } else if (field === 'dueDate') {
        patch.dueDate = value ? new Date(value).getTime() : undefined;
      } else if (field === 'assignee') {
        patch.assigneeId = value;
      }
      
      await updateTask({ id: taskId, patch });
      setEditingCell(null);
      setEditValue(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Start editing a cell
  const startEditing = (taskId: Id<"tasks">, field: 'status' | 'priority' | 'dueDate' | 'assignee', currentValue: any, projectId?: Id<"projects">) => {
    setEditingCell({ taskId, field, projectId });
    setEditValue(currentValue);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue(null);
  };


  // Column resizing state (px)
  const defaultWidths: Record<string, number> = {
    task: 320,
    project: 220,
    status: 140,
    priority: 120,
    dueDate: 140,
    assignee: 200,
  };

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('taskTableColumnWidths');
      if (raw) return { ...defaultWidths, ...JSON.parse(raw) };
    } catch (e) {}
    return defaultWidths;
  });

  const resizingRef = useRef<null | { key: string; startX: number; startWidth: number }>(null);
  const tableInnerRef = useRef<HTMLDivElement | null>(null);

  // keep a ref to latest widths so closures can access current values
  const colWidthsRef = useRef(colWidths);
  useEffect(() => { colWidthsRef.current = colWidths; }, [colWidths]);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      // nothing persisted here; individual handlers remove their listeners
    };
  }, []);

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidthsRef.current[key] ?? 100;
    resizingRef.current = { key, startX, startWidth };

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newW = Math.max(60, Math.round(startWidth + delta));
      setColWidths((prev) => ({ ...prev, [key]: newW }));
    };

    const onUp = () => {
      // persist latest widths
      try { localStorage.setItem('taskTableColumnWidths', JSON.stringify(colWidthsRef.current)); } catch (err) {}
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Ensure table inner container minWidth equals sum of column widths so columns can expand beyond wrapper
  useEffect(() => {
    try {
      const total = Object.values(colWidths).reduce((s, v) => s + (v || 0), 0) + 40; // padding
      if (tableInnerRef.current) {
        tableInnerRef.current.style.minWidth = `${total}px`;
      }
    } catch (e) {}
  }, [colWidths]);

  const autoFitColumn = (key: string) => {
    try {
      // Find header cell and all body cells for the column by data attribute
      const header = document.querySelector(`[data-col="${key}"]`) as HTMLElement | null;
      if (!header) return;

      const cells = Array.from(document.querySelectorAll(`[data-col="${key}"]`)) as HTMLElement[];

      // Measure max needed width
      let max = 0;
      cells.forEach((el) => {
        // use scrollWidth to get content width
        const w = el.scrollWidth || el.getBoundingClientRect().width;
        if (w > max) max = w;
      });

      // add some padding
      const newW = Math.max(60, Math.ceil(max) + 24);
      setColWidths((prev) => {
        const next = { ...prev, [key]: newW };
        try { localStorage.setItem('taskTableColumnWidths', JSON.stringify(next)); } catch (e) {}
        return next;
      });
    } catch (e) {
      // ignore
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40 font-semibold";
      case "high": return "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30 hover:shadow-lg hover:shadow-orange-500/40 font-medium";
      case "medium": return "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 shadow-md shadow-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/40 font-medium";
      case "low": return "bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40";
      default: return "bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm";
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toString().toLowerCase();
    switch (s) {
      case "done": return "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/30 hover:shadow-lg hover:shadow-green-500/40 font-medium";
      case "in-progress":
      case "in_progress":
      case "inprogress":
      case "in progress":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 font-medium";
      case "todo":
      case "to do":
      case "to_do":
        return "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md shadow-orange-500/30 hover:shadow-lg hover:shadow-orange-500/40";
      case "review": return "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 font-medium";
      case "blocked": return "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/30 hover:shadow-lg hover:shadow-red-600/40 font-semibold";
      default: return "bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "todo": return t('tasks.toDo');
      case "in-progress": return t('tasks.inProgress');
      case "in_progress": return t('tasks.inProgress');
      case "review": return t('tasks.review');
      case "done": return t('tasks.done');
      case "blocked": return t('tasks.blocked');
      default: return status;
    }
  };

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden shadow-sm">
      <div ref={tableInnerRef} className="overflow-x-auto">
        <Table>
        <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
          <TableRow className="hover:bg-transparent border-b border-border/50">
            <TableHead data-col="task" style={{ width: colWidths.task, whiteSpace: 'normal' }} className="break-words relative font-semibold text-foreground/90 pl-6">
              <div className="pr-2">{t('tasks.title') || 'Tarefa'}</div>
              <div
                onMouseDown={(e) => startResize('task', e)}
                onDoubleClick={() => autoFitColumn('task')}
                className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                title="Redimensionar coluna"
              />
            </TableHead>
            <TableHead data-col="project" style={{ width: colWidths.project, whiteSpace: 'normal' }} className="relative break-words font-semibold text-foreground/90">
              <div className="pr-2">{t('tasks.project')}</div>
              <div onMouseDown={(e) => startResize('project', e)} onDoubleClick={() => autoFitColumn('project')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
            <TableHead data-col="status" style={{ width: colWidths.status }} className="relative font-semibold text-foreground/90">
              <div className="pr-2">{t('tasks.status')}</div>
              <div onMouseDown={(e) => startResize('status', e)} onDoubleClick={() => autoFitColumn('status')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
            <TableHead data-col="priority" style={{ width: colWidths.priority }} className="relative font-semibold text-foreground/90">
              <div className="pr-2">{t('tasks.priority')}</div>
              <div onMouseDown={(e) => startResize('priority', e)} onDoubleClick={() => autoFitColumn('priority')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
            <TableHead data-col="dueDate" style={{ width: colWidths.dueDate }} className="relative font-semibold text-foreground/90">
              <div className="pr-2">{t('tasks.dueDate')}</div>
              <div onMouseDown={(e) => startResize('dueDate', e)} onDoubleClick={() => autoFitColumn('dueDate')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
            <TableHead data-col="assignee" style={{ width: colWidths.assignee }} className="relative font-semibold text-foreground/90 pr-6">
              <div className="pr-2">{t('tasks.assignedTo')}</div>
              <div onMouseDown={(e) => startResize('assignee', e)} onDoubleClick={() => autoFitColumn('assignee')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map((task) => (
            <TableRow 
              key={task._id} 
              className="hover:bg-gradient-to-r hover:from-muted/30 hover:to-primary/5 transition-all duration-200 border-b border-border/30 group"
            >
              <TableCell 
                data-col="task" 
                style={{ width: colWidths.task, whiteSpace: 'normal' }} 
                className="font-semibold break-words pr-2 text-foreground/90 group-hover:text-foreground transition-colors pl-6"
              >
                {task.title}
              </TableCell>
              <TableCell data-col="project" style={{ width: colWidths.project, whiteSpace: 'normal' }} className="break-words">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs break-words whitespace-normal">
                    {task.projectName}
                  </span>
                </div>
              </TableCell>
              <TableCell 
                data-col="status"
                data-editable
                onClick={() => startEditing(task._id, 'status', task.status, task.projectId)}
              >
                {editingCell?.taskId === task._id && editingCell?.field === 'status' ? (
                  <Select
                    value={editValue}
                    onValueChange={(value) => {
                      setEditValue(value);
                      handleSaveCell(task._id, 'status', value);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">{t('tasks.toDo')}</SelectItem>
                      <SelectItem value="in-progress">{t('tasks.inProgress')}</SelectItem>
                      <SelectItem value="review">{t('tasks.review')}</SelectItem>
                      <SelectItem value="done">{t('tasks.done')}</SelectItem>
                      <SelectItem value="blocked">{t('tasks.blocked')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge 
                    variant="secondary" 
                    className={cn(getStatusColor(task.status), "cursor-pointer hover:scale-105 transition-all duration-200 border-0")} 
                    style={{ width: Math.max(60, colWidths.status - 24) }}
                  >
                    {getStatusLabel(task.status)}
                  </Badge>
                )}
              </TableCell>
              <TableCell 
                data-col="priority" 
                data-editable
                style={{ width: colWidths.priority }}
                onClick={() => startEditing(task._id, 'priority', task.priority, task.projectId)}
              >
                {editingCell?.taskId === task._id && editingCell?.field === 'priority' ? (
                  <Select
                    value={editValue}
                    onValueChange={(value) => {
                      setEditValue(value);
                      handleSaveCell(task._id, 'priority', value);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('tasks.low')}</SelectItem>
                      <SelectItem value="medium">{t('tasks.medium')}</SelectItem>
                      <SelectItem value="high">{t('tasks.high')}</SelectItem>
                      <SelectItem value="urgent">{t('tasks.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge 
                    variant="secondary" 
                    className={cn(getPriorityColor(task.priority), "cursor-pointer hover:scale-105 transition-all duration-200 border-0")} 
                    style={{ width: Math.max(60, colWidths.priority - 24) }}
                  >
                    {t(`tasks.${task.priority}`) || task.priority}
                  </Badge>
                )}
              </TableCell>
              <TableCell 
                data-col="dueDate" 
                data-editable
                style={{ width: colWidths.dueDate }}
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "justify-start text-left font-normal h-8 px-2 hover:bg-accent/60 transition-colors rounded-md",
                        !task.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {task.dueDate ? (
                        <span className={new Date(task.dueDate) < new Date() && task.status !== 'done' ? "text-red-500 font-medium" : ""}>
                          {format(new Date(task.dueDate), "dd/MM/yyyy")}
                        </span>
                      ) : (
                        <span>Selecionar data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={task.dueDate ? new Date(task.dueDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          handleSaveCell(task._id, 'dueDate', date);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </TableCell>
              <TableCell 
                data-col="assignee" 
                data-editable
                style={{ width: colWidths.assignee }}
                className="pr-6"
                onClick={() => startEditing(task._id, 'assignee', task.assigneeId, task.projectId)}
              >
                {editingCell?.taskId === task._id && editingCell?.field === 'assignee' ? (
                  <Select
                    value={editValue || ""}
                    onValueChange={(value) => {
                      setEditValue(value);
                      handleSaveCell(task._id, 'assignee', value);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm w-full">
                      <SelectValue placeholder="Selecionar responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectMembers?.map((member) => (
                        <SelectItem key={member._id} value={member._id}>
                          <div className="flex items-center gap-2">
                            <span>{member.name}</span>
                            <span className="text-xs text-muted-foreground">({member.role})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="cursor-pointer hover:bg-accent/60 px-2 py-1 rounded-md transition-all duration-200">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 ring-2 ring-background shadow-sm">
                          <AvatarImage src={task.assignee.imageUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{task.assignee.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground/80 font-medium">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Sem responsável</span>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  );
}
