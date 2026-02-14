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
import { format } from "date-fns";
import { useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";

interface TaskTableProps {
  filteredTasks: any[];
  t: (key: string) => string;
  navigate: any; // Kept for backward compat if needed, or remove
  onTaskClick?: (task: any) => void;
}

export function TaskTable({ filteredTasks, t, navigate, onTaskClick }: TaskTableProps) {
  if (!filteredTasks || filteredTasks.length === 0) return null;

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

  const handleTaskClick = (task: any) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      navigate(`/projects/${task.projectId}?taskId=${task._id}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 hover:bg-red-100";
      // Alta -> vermelho
      case "high": return "bg-red-100 text-red-800 hover:bg-red-100";
      // Média -> amarelo
      case "medium": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      // Baixa -> azul
      case "low": return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      default: return "bg-slate-100 text-slate-800 hover:bg-slate-100";
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toString().toLowerCase();
    switch (s) {
      case "done": return "bg-green-100 text-green-800 hover:bg-green-100"; // manter cor atual
      // in progress variants -> azul
      case "in-progress":
      case "in_progress":
      case "inprogress":
      case "in progress":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      // todo / to do -> laranja
      case "todo":
      case "to do":
      case "to_do":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      case "review": return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "blocked": return "bg-red-100 text-red-800 hover:bg-red-100";
      default: return "bg-slate-100 text-slate-800 hover:bg-slate-100";
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
    <div className="rounded-md border overflow-x-auto">
      <div ref={tableInnerRef}>
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead data-col="task" style={{ width: colWidths.task, whiteSpace: 'normal' }} className="break-words relative">
              <div className="pr-2">{t('tasks.title') || 'Tarefa'}</div>
              <div
                onMouseDown={(e) => startResize('task', e)}
                onDoubleClick={() => autoFitColumn('task')}
                className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                title="Redimensionar coluna"
              />
            </TableHead>
            <TableHead data-col="project" style={{ width: colWidths.project, whiteSpace: 'normal' }} className="relative break-words">
              <div className="pr-2">{t('tasks.project')}</div>
              <div onMouseDown={(e) => startResize('project', e)} onDoubleClick={() => autoFitColumn('project')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
            <TableHead data-col="status" style={{ width: colWidths.status }} className="relative">
              <div className="pr-2">{t('tasks.status')}</div>
              <div onMouseDown={(e) => startResize('status', e)} onDoubleClick={() => autoFitColumn('status')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
            <TableHead data-col="priority" style={{ width: colWidths.priority }} className="relative">
              <div className="pr-2">{t('tasks.priority')}</div>
              <div onMouseDown={(e) => startResize('priority', e)} onDoubleClick={() => autoFitColumn('priority')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
            <TableHead data-col="dueDate" style={{ width: colWidths.dueDate }} className="relative">
              <div className="pr-2">{t('tasks.dueDate')}</div>
              <div onMouseDown={(e) => startResize('dueDate', e)} onDoubleClick={() => autoFitColumn('dueDate')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
            <TableHead data-col="assignee" style={{ width: colWidths.assignee }} className="relative">
              <div className="pr-2">{t('tasks.assignedTo')}</div>
              <div onMouseDown={(e) => startResize('assignee', e)} onDoubleClick={() => autoFitColumn('assignee')} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map((task) => (
            <TableRow 
              key={task._id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleTaskClick(task)}
            >
              <TableCell data-col="task" style={{ width: colWidths.task, whiteSpace: 'normal' }} className="font-medium break-words pr-2">{task.title}</TableCell>
              <TableCell data-col="project" style={{ width: colWidths.project, whiteSpace: 'normal' }} className="break-words">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs break-words whitespace-normal">
                    {task.projectName}
                  </span>
                </div>
              </TableCell>
               <TableCell data-col="status">
                <Badge variant="secondary" className={getStatusColor(task.status)} style={{ width: Math.max(60, colWidths.status - 24) }}>
                  {getStatusLabel(task.status)}
                </Badge>
              </TableCell>
              <TableCell data-col="priority" style={{ width: colWidths.priority }}>
                <Badge variant="secondary" className={getPriorityColor(task.priority)} style={{ width: Math.max(60, colWidths.priority - 24) }}>
                  {t(`tasks.${task.priority}`) || task.priority}
                </Badge>
              </TableCell>
              <TableCell data-col="dueDate" style={{ width: colWidths.dueDate }}>
                {task.dueDate ? (
                  <span className={new Date(task.dueDate) < new Date() && task.status !== 'done' ? "text-red-500 font-medium" : ""}>
                    {format(new Date(task.dueDate), "dd/MM/yyyy")}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell data-col="assignee" style={{ width: colWidths.assignee }}>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.imageUrl} />
                      <AvatarFallback>{task.assignee.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
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
