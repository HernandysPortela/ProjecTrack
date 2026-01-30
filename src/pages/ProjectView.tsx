import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Plus, CheckCircle2, Circle, Clock, AlertCircle, List, Calendar, LayoutGrid, GanttChart, Trash2, Edit, MoreVertical, ChevronRight, ChevronDown, Settings, Upload, Download, FileText, UserPlus, UserMinus, Ban, X, GripVertical, User } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Id } from "@convex/_generated/dataModel";
import { TASK_STATUS, TASK_PRIORITY } from "@/utils/constants";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable, pointerWithin, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskDependencyManager } from "@/components/TaskDependencyManager";
import { TaskDependencyIndicator } from "@/components/TaskDependencyIndicator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectFilters, ProjectFiltersState } from "@/components/ProjectFilters";

export default function ProjectView() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId as Id<"projects"> } : "skip"
  );
  const teams = useQuery(api.teams.list);

  const [filters, setFilters] = useState<ProjectFiltersState>({
    search: "",
    status: "all",
    priority: "all",
    assigneeId: "all",
    tagId: "all",
    tagIds: [],
  });

  const rawTasks = useQuery(
    api.tasks.list,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  const allTags = useQuery(
    api.tags.list,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  ) || [];

  const taskTagsData = useQuery(
    api.tags.getProjectTaskTags,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  ) || [];

  const tasks = useMemo(() => {
    if (!rawTasks) return undefined;
    
    // Helper function to recursively check if any ancestor matches the search
    const hasAncestorMatchingSearch = (task: any, searchTerm: string): boolean => {
      if (!task.parentTaskId) return false;
      
      const parentTask = rawTasks?.find((t: any) => t._id === task.parentTaskId);
      if (!parentTask) return false;
      
      // Check if parent matches
      if (parentTask.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }
      
      // Recursively check parent's ancestors
      return hasAncestorMatchingSearch(parentTask, searchTerm);
    };

    // Helper function to recursively check if any ancestor has the tag
    const hasAncestorMatchingTag = (task: any, tagId: string): boolean => {
      if (!task.parentTaskId) return false;
      
      const parentTask = rawTasks?.find((t: any) => t._id === task.parentTaskId);
      if (!parentTask) return false;
      
      // Check if parent has the tag
      const parentHasTag = taskTagsData.some((tt: any) => 
        tt.taskId === parentTask._id && tt.tagId === tagId
      );
      
      if (parentHasTag) return true;
      
      // Recursively check parent's ancestors
      return hasAncestorMatchingTag(parentTask, tagId);
    };
    
    return rawTasks.filter((task) => {
      // For search filter: only apply to parent tasks, subtasks are always included if any ancestor matches
      let matchesSearch = true;
      if (filters.search) {
        if (!task.parentTaskId) {
          // This is a parent task - check if it matches the search
          matchesSearch = task.title.toLowerCase().includes(filters.search.toLowerCase());
        } else {
          // This is a subtask - check if it or any of its ancestors match the search
          matchesSearch = task.title.toLowerCase().includes(filters.search.toLowerCase()) || 
                         hasAncestorMatchingSearch(task, filters.search);
        }
      }
      
      // Map filter status values to actual database status values
      let matchesStatus = true;
      if (filters.status !== "all") {
        const statusMap: Record<string, string> = {
          "todo": "To Do",
          "in_progress": "In Progress",
          "review": "Review",
          "done": "Done",
          "blocked": "Blocked"
        };
        const dbStatus = statusMap[filters.status];
        // Check against raw filter value, mapped value, and "To do" specifically
        matchesStatus = task.status === filters.status || 
                        (dbStatus !== undefined && task.status === dbStatus) ||
                        (filters.status === "todo" && task.status === "To do");
        
        // If parent doesn't match, check subtasks
        if (!matchesStatus) {
          matchesStatus = rawTasks?.some((subtask: any) => 
            subtask.parentTaskId === task._id && (
              subtask.status === filters.status ||
              (dbStatus !== undefined && subtask.status === dbStatus) ||
              (filters.status === "todo" && subtask.status === "To do")
            )
          ) || false;
        }
      }
      
      // Check priority at both task and subtask level
      let matchesPriority = filters.priority === "all" || task.priority === filters.priority;
      if (!matchesPriority && filters.priority !== "all") {
        // Check if any subtasks have the priority
        matchesPriority = rawTasks?.some((subtask: any) => 
          subtask.parentTaskId === task._id && 
          subtask.priority === filters.priority
        ) || false;
      }
      
      // Check assignee at both task and subtask level
      let matchesAssignee = true;
      if (filters.assigneeId !== "all") {
        // Check if the task itself has the assignee
        const taskHasAssignee = task.assigneeId === filters.assigneeId;
        
        // Check if any subtasks have the assignee
        const subtasksHaveAssignee = rawTasks?.some((subtask: any) => 
          subtask.parentTaskId === task._id && 
          subtask.assigneeId === filters.assigneeId
        ) || false;
        
        matchesAssignee = taskHasAssignee || subtasksHaveAssignee;
      }
      
      let matchesTag = true;
      const selectedTags = filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds : (filters.tagId !== "all" ? [filters.tagId] : []);

      if (selectedTags.length > 0) {
        // Check if the task has ALL selected tags (AND logic)
        const taskHasAllTags = selectedTags.every(tagId =>
          taskTagsData.some((tt: any) => tt.taskId === task._id && tt.tagId === tagId)
        );

        // For subtasks, check if any of their ancestors have all the tags
        const ancestorHasAllTags = task.parentTaskId
          ? selectedTags.every(tagId => hasAncestorMatchingTag(task, tagId))
          : false;

        matchesTag = taskHasAllTags || ancestorHasAllTags;
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesTag;
    });
  }, [rawTasks, filters, taskTagsData]);

  const workgroupId = project?.workgroupId;
  const workgroupMembers = useQuery(api.workgroups.getMembers, { 
    workgroupId: workgroupId as Id<"workgroups"> 
  });

  const projectMembers = useQuery(
    api.projectMembers.listMembers,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  // const allTeams = useQuery(api.teams.list); // Redundant, using 'teams' from line 35

  const allUsers = useQuery(api.users.listAll);

  const activeTags = useMemo(() => {
    if (!rawTasks || !allTags || !taskTagsData) return [];
    const usedTagIds = new Set<string>();
    taskTagsData.forEach((tt: any) => {
      if (tt.tagId) usedTagIds.add(tt.tagId);
    });
    return allTags.filter((tag: any) => usedTagIds.has(tag._id));
  }, [rawTasks, allTags, taskTagsData]);

  const activeAssignees = useMemo(() => {
    if (!allUsers) return [];
    const validUserIds = new Set<string>();
    
    // Add assignees from tasks
    if (rawTasks) {
      rawTasks.forEach((task: any) => {
        if (task.assigneeId) {
          validUserIds.add(task.assigneeId);
        }
      });
    }

    // Add project members to the list (so they can be filtered even if not assigned yet)
    if (projectMembers) {
      projectMembers.forEach((member: any) => {
        if (member.userId) validUserIds.add(member.userId);
        else if (member.user && member.user._id) validUserIds.add(member.user._id);
        else if (member._id) validUserIds.add(member._id); // Fallback
      });
    }

    return allUsers.filter((user: any) => validUserIds.has(user._id));
  }, [rawTasks, allUsers, projectMembers]);

  const kanbanColumns = useQuery(
    api.kanban.getColumns,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  // Add permission check for creating tasks
  const canCreateTasks = useQuery(
    api.permissions.hasPermission,
    project ? {
      workgroupId: project.workgroupId,
      area: "tasks",
      action: "create" as const
    } : "skip"
  );

  const assignableUsers = useQuery(
    api.projectMembers.getAssignableUsers,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );
  const assignableOptions = assignableUsers ?? [];

  const managerHistory = useQuery(
    api.projects.managerHistory,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"list" | "timeline" | "kanban" | "gantt" | "summary">("list");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubtaskDialog, setIsSubtaskDialog] = useState(false);
  const [parentTaskId, setParentTaskId] = useState<Id<"tasks"> | undefined>();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState(TASK_STATUS.TODO);
  const [taskPriority, setTaskPriority] = useState(TASK_PRIORITY.MEDIUM);
  const [taskAssignee, setTaskAssignee] = useState<Id<"users"> | undefined>();
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstimatedCost, setTaskEstimatedCost] = useState("");
  
  // Format currency for display
  const formatCurrency = (value: number | string | undefined): string => {
    if (!value) return "";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<Id<"tasks"> | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Id<"tasks"> | null>(null);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<any | null>(null);
  const [columnName, setColumnName] = useState("");
  const [columnColor, setColumnColor] = useState("#6b7280");
  const [isColumnCreating, setIsColumnCreating] = useState(false);
  const [isDeleteColumnDialogOpen, setIsDeleteColumnDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<any | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"manual" | "priority" | "startDate" | "dueDate">("manual");
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Id<"tasks"> | null>(null);
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  // Project Settings state
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"access" | "transfer" | "members">("access");
  const [selectedTaskForAccess, setSelectedTaskForAccess] = useState<Id<"tasks"> | null>(null);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState<Id<"users"> | null>(null);
  const [canView, setCanView] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [newManagerId, setNewManagerId] = useState<Id<"users"> | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("contributor");
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<Id<"users"> | null>(null);
  const [restrictToTeams, setRestrictToTeams] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Id<"teams">[]>([]);

  const projectTags = useQuery(
    api.tags.list,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  const taskChecklistItems = useQuery(
    api.checklists.list,
    selectedTaskForDetails ? { taskId: selectedTaskForDetails } : "skip"
  );

  const taskTagsList = useQuery(
    api.tags.getTaskTags,
    selectedTaskForDetails ? { taskId: selectedTaskForDetails } : "skip"
  );

  const taskComments = useQuery(
    api.comments.list,
    selectedTaskForDetails ? { taskId: selectedTaskForDetails } : "skip"
  );
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [taskTags, setTaskTags] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);

  const statusLabelMap = useMemo<Record<string, string>>(
    () => ({
      [TASK_STATUS.TODO]: "To Do",
      [TASK_STATUS.IN_PROGRESS]: "In Progress",
      [TASK_STATUS.REVIEW]: "Review",
      [TASK_STATUS.DONE]: "Done",
      [TASK_STATUS.BLOCKED]: "Blocked",
    }),
    []
  );

  const priorityLabelMap = useMemo<Record<string, string>>(
    () => ({
      [TASK_PRIORITY.LOW]: "Low",
      [TASK_PRIORITY.MEDIUM]: "Medium",
      [TASK_PRIORITY.HIGH]: "High",
      [TASK_PRIORITY.URGENT]: "Urgent",
    }),
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const deleteProject = useMutation(api.projects.remove);
  const grantTaskAccess = useMutation(api.taskPermissions.grantAccess);
  const revokeTaskAccess = useMutation(api.taskPermissions.revokeAccess);
  const taskPermissions = useQuery(
    api.taskPermissions.listTaskPermissions,
    selectedTaskForAccess ? { taskId: selectedTaskForAccess } : "skip"
  );
  const createColumn = useMutation(api.kanban.createColumn);
  const updateColumn = useMutation(api.kanban.updateColumn);
  const deleteColumn = useMutation(api.kanban.deleteColumn);
  const reorderColumns = useMutation(api.kanban.reorderColumns);
  const reorderTask = useMutation(api.tasks.reorderTask);
  const createChecklistItem = useMutation(api.checklists.create);
  const toggleChecklistItem = useMutation(api.checklists.toggle);
  const deleteChecklistItem = useMutation(api.checklists.deleteItem);
  const createTag = useMutation(api.tags.create);
  const addTagToTask = useMutation(api.tags.addTagToTask);
  const removeTagFromTask = useMutation(api.tags.removeTagFromTask);
  const deleteTag = useMutation(api.tags.deleteTag);
  const createComment = useMutation(api.comments.create);
  const deleteComment = useMutation(api.comments.deleteComment);

  const taskAttachments = useQuery(
    api.attachments.list,
    selectedTaskForDetails ? { taskId: selectedTaskForDetails } : "skip"
  );

  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const createAttachment = useMutation(api.attachments.createAttachment);
  const deleteAttachment = useMutation(api.attachments.deleteAttachment);

  // Project Settings mutations
  const grantAccessMutation = useMutation(api.taskPermissions.grantAccess);
  const blockUserMutation = useMutation(api.taskBlocking.blockUserFromTask);
  const unblockUserMutation = useMutation(api.taskBlocking.unblockUserFromTask);
  const updateTeamRestrictionsMutation = useMutation(api.projects.updateProject);
  const updateProject = useMutation(api.projects.updateProject);

  const createTaskMutation = useMutation(api.tasks.create);

  // Auto-save function with debounce
  const autoSaveTask = useCallback(async () => {
    if (!editingTask || !taskTitle.trim()) return;

    try {
      await updateTask({
        id: editingTask,
        patch: {
          title: taskTitle,
          description: taskDescription || undefined,
          status: taskStatus,
          priority: taskPriority,
          ...(taskAssignee && { assigneeId: taskAssignee }),
          startDate: taskStartDate ? new Date(taskStartDate + 'T00:00:00-03:00').getTime() : undefined,
          dueDate: taskDueDate ? new Date(taskDueDate + 'T23:59:59-03:00').getTime() : undefined,
          estimatedCost: taskEstimatedCost ? parseFloat(taskEstimatedCost) : undefined,
        }
      });
    } catch (error: any) {
      console.error("Auto-save failed:", error);
      // Extract clean error message from Convex error
      const errorMessage = error?.message || error?.toString() || "Erro ao salvar tarefa";
      // Show permission errors to the user
      if (errorMessage.includes("permissão") || errorMessage.includes("permission")) {
        toast.error(errorMessage);
      }
    }
  }, [editingTask, taskTitle, taskDescription, taskStatus, taskPriority, taskAssignee, taskStartDate, taskDueDate, taskEstimatedCost, updateTask]);

  // Trigger auto-save when task fields change
  useEffect(() => {
    if (editingTask && isEditDialogOpen) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveTask();
      }, 1000);
    }
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [taskTitle, taskDescription, taskStatus, taskPriority, taskAssignee, taskStartDate, taskDueDate, taskEstimatedCost, editingTask, isEditDialogOpen, autoSaveTask]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (taskChecklistItems) setChecklistItems(taskChecklistItems);
  }, [taskChecklistItems]);

  useEffect(() => {
    if (taskTagsList) setTaskTags(taskTagsList);
  }, [taskTagsList]);

  useEffect(() => {
    if (taskComments) setComments(taskComments);
  }, [taskComments]);

  useEffect(() => {
    if (taskAttachments) setAttachments(taskAttachments);
  }, [taskAttachments]);

  // Detect taskId from URL and open task details dialog automatically
  useEffect(() => {
    const taskIdFromUrl = searchParams.get('taskId');
    if (taskIdFromUrl && rawTasks) {
      const task = rawTasks.find((t: any) => t._id === taskIdFromUrl);
      if (task) {
        // Open the edit dialog with the task
        setEditingTask(task._id);
        setSelectedTaskForDetails(task._id);
        setTaskTitle(task.title);
        setTaskDescription(task.description || "");
        setTaskStatus(task.status as any);
        setTaskPriority(task.priority as any);
        setTaskAssignee(task.assigneeId);
        setTaskStartDate(task.startDate ? new Date(task.startDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-') : "");
        setTaskDueDate(task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-') : "");
        setTaskEstimatedCost(task.estimatedCost ? task.estimatedCost.toString() : "");
        setIsEditDialogOpen(true);

        // Remove taskId from URL after opening
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('taskId');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [searchParams, rawTasks, setSearchParams]);

  const downloadTasksAsExcel = useCallback(() => {
    if (!tasks || tasks.length === 0) {
      toast.warning("Nenhuma tarefa para exportar.");
      return;
    }

    const sanitizeValue = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return "";
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    const formatDateValue = (value: number | string | null | undefined) => {
      if (!value) return "";
      const date = typeof value === "number" ? new Date(value) : new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    };

    const formatCurrency = (value: number | null | undefined) => {
      if (!value) return "R$ 0,00";
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const headers = [
      "Título",
      "Status",
      "Prioridade",
      "Responsável",
      "Data de início",
      "Prazo final",
      "Custo Estimado",
      "Descrição",
    ];

    const headerRow = headers.map((header) => `<th>${sanitizeValue(header)}</th>`).join("");

    const bodyRows = tasks
      .map((task: any) => {
        return `<tr>
          <td>${sanitizeValue(task.title)}</td>
          <td>${sanitizeValue(statusLabelMap[task.status] ?? task.status)}</td>
          <td>${sanitizeValue(priorityLabelMap[task.priority] ?? task.priority)}</td>
          <td>${sanitizeValue(task.assigneeName || "Não atribuído")}</td>
          <td>${sanitizeValue(formatDateValue(task.startDate))}</td>
          <td>${sanitizeValue(formatDateValue(task.dueDate))}</td>
          <td>${sanitizeValue(formatCurrency(task.estimatedCost))}</td>
          <td>${sanitizeValue(task.description || "")}</td>
        </tr>`;
      })
      .join("");

    const table = `<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    const worksheet = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8" /></head><body>${table}</body></html>`;
    const blob = new Blob([worksheet], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const safeName =
      (project?.name || "project").toLowerCase().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "project";
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeName}_tasks_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success("Exportação iniciada com sucesso.");
  }, [priorityLabelMap, project, statusLabelMap, tasks]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !projectId) return;

    setIsCreating(true);
    try {
      if (editingTask) {
        // Update existing task
        await updateTask({
          id: editingTask,
          patch: {
            title: taskTitle,
            description: taskDescription || undefined,
            status: taskStatus,
            priority: taskPriority,
            ...(taskAssignee && { assigneeId: taskAssignee }),
            startDate: taskStartDate ? new Date(taskStartDate + 'T00:00:00-03:00').getTime() : undefined,
            dueDate: taskDueDate ? new Date(taskDueDate + 'T23:59:59-03:00').getTime() : undefined,
          }
        });
        toast.success("Task updated successfully");
        resetForm();
      } else {
        // Create new task
        const newTaskId = await createTask({
          projectId: projectId as Id<"projects">,
          parentTaskId: isSubtaskDialog ? parentTaskId : undefined,
          title: taskTitle,
          description: taskDescription || undefined,
          status: taskStatus,
          priority: taskPriority,
          ...(taskAssignee && { assigneeId: taskAssignee }),
          startDate: taskStartDate ? new Date(taskStartDate + 'T00:00:00-03:00').getTime() : undefined,
          dueDate: taskDueDate ? new Date(taskDueDate + 'T23:59:59-03:00').getTime() : undefined,
        });

        // Add checklist items if any
        for (const item of checklistItems) {
          if (item.text && !item._id) {
            await createChecklistItem({
              taskId: newTaskId,
              text: item.text,
            });
          }
        }

        // Add tags if any
        for (const tag of taskTags) {
          if (tag._id && !tag.taskTagId) {
            await addTagToTask({
              taskId: newTaskId,
              tagId: tag._id,
            });
          }
        }

        // Add comments if any
        for (const comment of comments) {
          if (comment.body && !comment._id) {
            await createComment({
              taskId: newTaskId,
              body: comment.body,
            });
          }
        }

        toast.success(isSubtaskDialog ? "Subtask created successfully" : "Task created successfully");
      }
      resetForm();
    } catch (error: any) {
      // Extract clean error message from Convex error
      const errorMessage = error?.message || error?.toString() || "Erro desconhecido";
      toast.error(errorMessage);
      console.error("Task save error:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsSubtaskDialog(false);
    setParentTaskId(undefined);
    setEditingTask(null);
    setSelectedTaskForDetails(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskStatus(TASK_STATUS.TODO);
    setTaskPriority(TASK_PRIORITY.MEDIUM);
    setTaskAssignee(undefined);
    setTaskStartDate("");
    setTaskDueDate("");
    setTaskEstimatedCost("");
    setChecklistItems([]);
    setTaskTags([]);
    setComments([]);
    setNewChecklistItem("");
    setNewComment("");
  };

  const openSubtaskDialog = (taskId: Id<"tasks">) => {
    setParentTaskId(taskId);
    setIsSubtaskDialog(true);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (task: any) => {
    setEditingTask(task._id);
    setSelectedTaskForDetails(task._id);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskAssignee(task.assigneeId);
    setTaskStartDate(task.startDate ? new Date(task.startDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-') : "");
    setTaskDueDate(task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-') : "");
    setTaskEstimatedCost(task.estimatedCost ? task.estimatedCost.toString() : "");
    setIsEditDialogOpen(true);
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return;
    
    if (selectedTaskForDetails) {
      // Existing task - save to database
      try {
        await createChecklistItem({
          taskId: selectedTaskForDetails,
          text: newChecklistItem,
        });
        setNewChecklistItem("");
        toast.success("Checklist item added");
      } catch (error) {
        toast.error("Failed to add checklist item");
      }
    } else {
      // New task - add to local state
      setChecklistItems(prev => [...prev, { text: newChecklistItem, completed: false, order: prev.length }]);
      setNewChecklistItem("");
    }
  };

  const handleToggleChecklistItem = async (itemId: Id<"checklist_items">, completed: boolean) => {
    try {
      await toggleChecklistItem({ id: itemId, completed: !completed });
    } catch (error) {
      toast.error("Failed to update checklist item");
    }
  };

  const handleDeleteChecklistItem = async (itemId: Id<"checklist_items">) => {
    try {
      await deleteChecklistItem({ id: itemId });
      toast.success("Checklist item deleted");
    } catch (error) {
      toast.error("Failed to delete checklist item");
    }
  };

  const handleDeleteTag = async (tagId: Id<"tags">) => {
    if (!window.confirm("Are you sure you want to delete this tag? It will be removed from all tasks.")) {
      return;
    }
    
    try {
      await deleteTag({ tagId });
      toast.success("Tag deleted successfully");
    } catch (error) {
      toast.error("Failed to delete tag");
      console.error(error);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !projectId) return;

    try {
      await createTag({
        projectId: projectId as Id<"projects">,
        name: newTagName,
        color: newTagColor,
      });
      setNewTagName("");
      setNewTagColor("#3b82f6");
      toast.success("Tag created");
    } catch (error) {
      toast.error("Failed to create tag");
    }
  };

  const handleAddTagToTask = async (taskId: Id<"tasks">, tagId: string) => {
    if (taskId) {
      try {
        await addTagToTask({
          taskId,
          tagId: tagId as Id<"tags">,
        });
        toast.success("Tag added to task");
      } catch (error) {
        toast.error("Failed to add tag");
      }
    } else {
      // New task - add to local state
      const tag = projectTags?.find((t: any) => t._id === tagId);
      if (tag) {
        setTaskTags(prev => [...prev, tag]);
      }
    }
  };

  const handleRemoveTagFromTask = async (taskTagId: Id<"task_tags">) => {
    try {
      await removeTagFromTask({ taskTagId });
      toast.success("Tag removed");
    } catch (error) {
      toast.error("Failed to remove tag");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    if (selectedTaskForDetails) {
      // Existing task - save to database
      try {
        await createComment({
          taskId: selectedTaskForDetails,
          body: newComment,
        });
        setNewComment("");
        toast.success("Comment added");
      } catch (error) {
        toast.error("Failed to add comment");
      }
    } else {
      // New task - add to local state
      setComments(prev => [...prev, { body: newComment, userName: user?.name || "You" }]);
      setNewComment("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedTaskForDetails) {
      toast.error("Please save the task before uploading files");
      return;
    }

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Generate upload URL
        const uploadUrl = await generateUploadUrl();
        
        // Upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        const { storageId } = await result.json();

        // Create attachment record
        await createAttachment({
          taskId: selectedTaskForDetails,
          storageId,
          fileName: file.name,
          fileSize: file.size,
        });
      }
      
      toast.success("Files uploaded successfully");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Failed to upload files");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: Id<"attachments">) => {
    try {
      await deleteAttachment({ id: attachmentId });
      toast.success("Attachment deleted");
    } catch (error) {
      toast.error("Failed to delete attachment");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      await deleteTask({ id: taskToDelete });
      toast.success("Task deleted successfully");
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      toast.error("Failed to delete task");
      console.error(error);
    }
  };

  const handleDeleteProject = () => {
    console.log("=== HANDLE DELETE PROJECT CALLED ===");
    console.log("ProjectId:", projectId);
    console.log("Project:", project);
    
    if (!projectId) {
      console.log("No project ID");
      toast.error("Project ID not found");
      return;
    }
    
    if (!project) {
      console.log("No project loaded");
      toast.error("Project not loaded");
      return;
    }
    
    setIsDeleteProjectDialogOpen(true);
  };

  const confirmDeleteProject = () => {
    console.log("Calling deleteProject with ID:", projectId);
    deleteProject({ id: projectId as Id<"projects"> })
      .then(() => {
        console.log("Delete successful");
        toast.success("Project deleted successfully");
        navigate(`/workgroup/${project.workgroupId}`);
      })
      .catch((error: any) => {
        console.error("Delete error:", error);
        toast.error(error?.message || "Failed to delete project");
      });
  };

  const handleCreateOrUpdateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnName.trim() || !projectId) return;

    setIsColumnCreating(true);
    try {
      if (editingColumn && '_id' in editingColumn) {
        // Update existing custom column
        await updateColumn({
          id: editingColumn._id,
          name: columnName,
          color: columnColor,
        });
        toast.success("Column updated successfully");
      } else if (editingColumn && !('_id' in editingColumn)) {
        // Convert default column to custom column
        await createColumn({
          projectId: projectId as Id<"projects">,
          name: columnName,
          color: columnColor,
          statusKey: editingColumn.statusKey,
        });
        toast.success("Column updated successfully");
      } else {
        // Create new custom column
        await createColumn({
          projectId: projectId as Id<"projects">,
          name: columnName,
          color: columnColor,
        });
        toast.success("Column created successfully");
      }
      setIsColumnDialogOpen(false);
      setEditingColumn(null);
      setColumnName("");
      setColumnColor("#6b7280");
    } catch (error) {
      toast.error("Failed to save column");
      console.error(error);
    } finally {
      setIsColumnCreating(false);
    }
  };

  const handleDeleteColumn = async () => {
    if (!columnToDelete || !('_id' in columnToDelete)) return;
    
    try {
      // Move tasks to the first available status (TODO by default)
      await deleteColumn({ 
        id: columnToDelete._id, 
        moveTasksToStatus: TASK_STATUS.TODO 
      });
      toast.success("Column deleted successfully");
      setIsDeleteColumnDialogOpen(false);
      setColumnToDelete(null);
    } catch (error) {
      toast.error("Failed to delete column");
      console.error(error);
    }
  };

  const openDeleteColumnDialog = (column: any) => {
    setColumnToDelete(column);
    setIsDeleteColumnDialogOpen(true);
  };

  const openColumnDialog = (column?: any) => {
    if (column) {
      setEditingColumn(column);
      setColumnName(column.name);
      setColumnColor(column.color || "#6b7280");
    } else {
      setEditingColumn(null);
      setColumnName("");
      setColumnColor("#6b7280");
    }
    setIsColumnDialogOpen(true);
  };

  const getStatusIcon = (status: string, smallIcon: boolean = false) => {
    const iconSize = smallIcon ? "h-3 w-3" : "h-4 w-4";
    switch (status) {
      case TASK_STATUS.DONE:
        return <CheckCircle2 className={`${iconSize} text-green-600`} />;
      case TASK_STATUS.IN_PROGRESS:
        return <Clock className={`${iconSize} text-blue-600`} />;
      case TASK_STATUS.BLOCKED:
        return <AlertCircle className={`${iconSize} text-red-600`} />;
      case TASK_STATUS.REVIEW:
        return <Circle className={`${iconSize} text-purple-600`} />;
      default:
        return <Circle className={`${iconSize} text-muted-foreground`} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case TASK_PRIORITY.URGENT:
        return "bg-red-100 text-red-700 border-red-200";
      case TASK_PRIORITY.HIGH:
        return "bg-orange-100 text-orange-700 border-orange-200";
      case TASK_PRIORITY.MEDIUM:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const parentTasks = (tasks?.filter(t => !t.parentTaskId) || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const isProjectOwner = project?.ownerId === user._id;
  
  // Check if current user has Owner or Manager role in the workgroup
  const currentUserMember = workgroupMembers?.find(m => m.userId === user._id);
  const userRole = currentUserMember?.role;
  const canAccessSettings = userRole === "owner" || userRole === "manager";

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getTaskSubtasks = (taskId: Id<"tasks">, allTasks: typeof tasks): any[] => {
    if (!allTasks) return [];
    return allTasks.filter(t => t.parentTaskId === taskId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      console.log("No drop target detected");
      return;
    }

    const taskId = active.id as Id<"tasks">;
    const overId = over.id as string;
    
    console.log("Drag ended:", { taskId, overId, overData: over.data });
    
    // Get fresh column data
    const columns = kanbanColumns || [];
    
    // Check if we're dropping on a column or reordering within a column
    const isColumn = columns.some(col => col.statusKey === overId);
    
    console.log("Is column drop:", isColumn);
    
    if (isColumn) {
      // Dropping on a column - change status
      const newStatus = overId;
      const currentTask = tasks?.find(t => t._id === taskId);
      
      console.log("Current task status:", currentTask?.status, "New status:", newStatus);
      
      if (currentTask?.status === newStatus) {
        console.log("Status unchanged");
        return;
      }

      try {
        console.log("Updating task status to:", newStatus);
        await updateTask({
          id: taskId,
          patch: {
            status: newStatus,
          }
        });
        toast.success("Task status updated");
      } catch (error) {
        toast.error("Failed to update task status");
        console.error("Update error:", error);
      }
    } else {
      // Check if we're dropping on another task (reordering)
      const overTask = tasks?.find(t => t._id === overId);
      
      if (overTask) {
        // Reordering - move to the same column as the task we're dropping on
        const currentTask = tasks?.find(t => t._id === taskId);
        
        if (currentTask && active.id !== over.id) {
          // If dropping on a task in a different column, change status
          if (currentTask.status !== overTask.status) {
            try {
              console.log("Moving task to different column via task drop:", overTask.status);
              await updateTask({
                id: taskId,
                patch: {
                  status: overTask.status,
                }
              });
              toast.success("Task moved to new column");
            } catch (error) {
              toast.error("Failed to move task");
              console.error("Move error:", error);
            }
          } else {
            // Same column - just reorder
            try {
              await reorderTask({
                id: taskId,
                targetId: overId as Id<"tasks">,
                projectId: project._id,
                sameStatusOnly: true, // No Kanban, reordena apenas dentro da mesma coluna
              });
              toast.success("Task reordered");
            } catch (error) {
              toast.error("Failed to reorder task");
              console.error("Reorder error:", error);
            }
          }
        }
      }
    }
  };

  const handleColumnDragStart = (event: DragStartEvent) => {
    setActiveColumnId(event.active.id as string);
  };

  const handleColumnDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveColumnId(null);

    if (!over || active.id === over.id || !projectId) return;

    const columns = kanbanColumns || [];
    const oldIndex = columns.findIndex(col => 
      ('_id' in col ? col._id : col.statusKey) === active.id
    );
    const newIndex = columns.findIndex(col => 
      ('_id' in col ? col._id : col.statusKey) === over.id
    );

    if (oldIndex === -1 || newIndex === -1) return;

    // Calculate the new order based on the target position
    const targetColumn = columns[newIndex];
    const newOrder = targetColumn.order;

    try {
      await reorderColumns({
        projectId: projectId as Id<"projects">,
        columnId: active.id as string,
        newOrder: newOrder,
      });
      toast.success("Column reordered successfully");
    } catch (error) {
      toast.error("Failed to reorder column");
      console.error(error);
    }
  };

  const TaskTagsDisplay = ({ taskId, showDelete = false }: { taskId: Id<"tasks">; showDelete?: boolean }) => {
    const tags = useQuery(api.tags.getTaskTags, { taskId });
    
    if (!tags || tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag: any) => (
          <div key={tag._id} className="flex items-center gap-1">
            <Badge
              style={{ backgroundColor: tag.color }}
              className="text-white text-xs px-2 py-0.5"
            >
              {tag.name}
            </Badge>
            {showDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  if (tag.taskTagId) {
                    handleRemoveTagFromTask(tag.taskTagId);
                  }
                }}
              >
                <X className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const SortableTaskItem = ({ task, level = 0 }: { task: any; level?: number }) => {
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

    // Safety check: ensure task still exists
    if (!task || !tasks?.find((t: any) => t._id === task._id)) {
      return null;
    }

    const subtasks = getTaskSubtasks(task._id, tasks);
    const hasSubtasks = subtasks.length > 0;
    const isExpanded = expandedTasks.has(task._id);
    const parentTask = task.parentTaskId ? tasks?.find((t: any) => t._id === task.parentTaskId) : null;

    return (
      <div ref={setNodeRef} style={style} key={task._id}>
        <div style={{ marginLeft: `${level * 24}px` }}>
          <Card className="shadow-md hover:shadow-lg transition-shadow mb-2 cursor-grab active:cursor-grabbing">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {hasSubtasks && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskExpansion(task._id);
                      }}
                      className="mt-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  {!hasSubtasks && <div className="w-4" />}
                  {getStatusIcon(task.status)}
                  <div className="flex-1 cursor-pointer" onClick={() => !isDragging && openEditDialog(task)}>
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    {task.parentTaskId && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <span>Subtask of:</span>
                        {parentTask ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(parentTask);
                            }}
                            className="text-primary hover:underline font-medium"
                          >
                            {parentTask.title}
                          </button>
                        ) : (
                          <span className="text-muted-foreground italic">(Parent task not found)</span>
                        )}
                      </div>
                    )}
                    {task.description && (
                      <CardDescription className="mt-1">
                        {task.description}
                      </CardDescription>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {/* Priority Badge with Icon */}
                      <Badge className={`text-xs px-2 py-1 ${getPriorityColor(task.priority)} flex items-center gap-1 font-medium`}>
                        <AlertCircle className="h-3 w-3" />
                        {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>

                      {/* Status Badge with Icon */}
                      <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1">
                        {getStatusIcon(task.status, true)}
                        {task.status === 'todo' ? 'A Fazer' : task.status === 'in_progress' ? 'Em Progresso' : task.status === 'review' ? 'Revisão' : task.status === 'done' ? 'Concluído' : 'Bloqueado'}
                      </Badge>

                      {task.assigneeName && (
                        <Badge variant="secondary" className="text-xs px-2 py-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assigneeName}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        </Badge>
                      )}
                      {hasSubtasks && (
                        <Badge variant="secondary" className="text-xs px-2 py-1 flex items-center gap-1">
                          <List className="h-3 w-3" />
                          {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      <TaskDependencyIndicator taskId={task._id} />
                      <TaskTagsDisplay taskId={task._id} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSubtaskDialog(task._id)}
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Subtask
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(task)}
                    className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  {isProjectOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTaskToDelete(task._id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
          {isExpanded && hasSubtasks && (
            <div className="ml-6">
              {subtasks.filter((st: any) => tasks?.find((t: any) => t._id === st._id)).map(subtask => (
                <SortableTaskItem key={subtask._id} task={subtask} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTaskItem = (task: any, level: number = 0) => {
    // Safety check: ensure task still exists
    if (!task || !tasks?.find((t: any) => t._id === task._id)) {
      return null;
    }

    const subtasks = getTaskSubtasks(task._id, tasks);
    const hasSubtasks = subtasks.length > 0;
    const isExpanded = expandedTasks.has(task._id);
    const parentTask = task.parentTaskId ? tasks?.find((t: any) => t._id === task.parentTaskId) : null;

    return (
      <div key={task._id} style={{ marginLeft: `${level * 24}px` }}>
        <Card className="shadow-md hover:shadow-lg transition-shadow mb-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {hasSubtasks && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskExpansion(task._id);
                    }}
                    className="mt-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                )}
                {!hasSubtasks && <div className="w-4" />}
                {getStatusIcon(task.status)}
                <div className="flex-1 cursor-pointer" onClick={() => openEditDialog(task)}>
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  {task.parentTaskId && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <span>Subtask of:</span>
                      {parentTask ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(parentTask);
                          }}
                          className="text-primary hover:underline font-medium"
                        >
                          {parentTask.title}
                        </button>
                      ) : (
                        <span className="text-muted-foreground italic">(Parent task not found)</span>
                      )}
                    </div>
                  )}
                  {task.description && (
                    <CardDescription className="mt-1">
                      {task.description}
                    </CardDescription>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {/* Priority Badge with Icon */}
                    <Badge className={`text-xs px-2 py-1 ${getPriorityColor(task.priority)} flex items-center gap-1 font-medium`}>
                      <AlertCircle className="h-3 w-3" />
                      {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>

                    {/* Status Badge with Icon */}
                    <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1">
                      {getStatusIcon(task.status, true)}
                      {task.status === 'todo' ? 'A Fazer' : task.status === 'in_progress' ? 'Em Progresso' : task.status === 'review' ? 'Revisão' : task.status === 'done' ? 'Concluído' : 'Bloqueado'}
                    </Badge>

                    {task.assigneeName && (
                      <Badge variant="secondary" className="text-xs px-2 py-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.assigneeName}
                      </Badge>
                    )}
                    {task.dueDate && (
                      <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                      </Badge>
                    )}
                    {hasSubtasks && (
                      <Badge variant="secondary" className="text-xs px-2 py-1 flex items-center gap-1">
                        <List className="h-3 w-3" />
                        {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    <TaskDependencyIndicator taskId={task._id} />
                    <TaskTagsDisplay taskId={task._id} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSubtaskDialog(task._id)}
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Subtask
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(task)}
                  className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                {isProjectOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTaskToDelete(task._id);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
        {isExpanded && hasSubtasks && (
          <div className="ml-6">
            {subtasks.filter((st: any) => tasks?.find((t: any) => t._id === st._id)).map(subtask => renderTaskItem(subtask, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleListDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const taskId = active.id as Id<"tasks">;
    const overId = over.id as Id<"tasks">;

    try {
      await reorderTask({
        id: taskId,
        targetId: overId,
        projectId: project._id,
        sameStatusOnly: false, // Na lista, reordena todas as tarefas
      });
      toast.success("Task reordered");
    } catch (error) {
      toast.error("Failed to reorder task");
      console.error("Reorder error:", error);
    }
  };

  const renderListView = () => (
    <DndContext
      onDragEnd={handleListDragEnd}
      collisionDetection={closestCenter}
    >
      <SortableContext
        items={parentTasks.map(t => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {parentTasks.map((task, index) => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <SortableTaskItem task={task} />
            </motion.div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  const SubtaskCard = ({ subtask }: { subtask: any }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: subtask._id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const getStatusIndicator = (status: string) => {
      switch (status) {
        case TASK_STATUS.DONE:
          return { icon: "✓", color: "bg-green-500", label: "Done" };
        case TASK_STATUS.IN_PROGRESS:
          return { icon: "⟳", color: "bg-blue-500", label: "In Progress" };
        case TASK_STATUS.REVIEW:
          return { icon: "👁", color: "bg-purple-500", label: "Review" };
        case TASK_STATUS.BLOCKED:
          return { icon: "⚠", color: "bg-red-500", label: "Blocked" };
        case TASK_STATUS.TODO:
        default:
          return { icon: "○", color: "bg-gray-400", label: "To Do" };
      }
    };

    const statusInfo = getStatusIndicator(subtask.status);

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation();
            openEditDialog(subtask);
          }
        }}
      >
        <div className="flex items-start gap-2">
          <div 
            className={`flex-shrink-0 w-5 h-5 rounded-full ${statusInfo.color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
            title={statusInfo.label}
          >
            {statusInfo.icon}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium mb-1">{subtask.title}</p>
            <div className="flex flex-wrap gap-1">
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${getPriorityColor(subtask.priority)}`}>
                {subtask.priority}
              </span>
              {subtask.assigneeName && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {subtask.assigneeName}
                </span>
              )}
              {!isDragging && <TaskTagsDisplay taskId={subtask._id} />}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const KanbanCard = ({ task, subtasks }: { task: any; subtasks?: any[] }) => {
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

    const hasSubtasks = subtasks && subtasks.length > 0;
    const isExpanded = expandedTasks.has(task._id);

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-card text-card-foreground rounded-lg border shadow-sm"
      >
        <div
          onClick={(e) => {
            if (!isDragging) {
              openEditDialog(task);
            }
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-sm break-words leading-snug flex-1">{task.title}</h4>
            {hasSubtasks && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTaskExpansion(task._id);
                }}
                className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            {task.assigneeName && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {task.assigneeName}
              </span>
            )}
            {!isDragging && <TaskTagsDisplay taskId={task._id} />}
          </div>
          {hasSubtasks && (
            <div className="text-xs text-muted-foreground">
              {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        {hasSubtasks && isExpanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {subtasks.map((subtask) => (
              <SubtaskCard key={subtask._id} subtask={subtask} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const KanbanColumn = ({ column, columnTasks, subtasksByParent }: { column: any; columnTasks: any[]; subtasksByParent: Record<string, any[]> }) => {
    const {
      attributes,
      listeners,
      setNodeRef: setSortableRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ 
      id: '_id' in column ? column._id : column.statusKey 
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
      id: column.statusKey,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const isCustomColumn = '_id' in column;
    const columnColor = column.color || '#6b7280';

    return (
      <div ref={setSortableRef} style={style} className="flex flex-col min-w-[300px] max-w-[300px] h-full">
        <div 
          className="p-3 rounded-t-lg border-b flex items-center justify-between cursor-grab active:cursor-grabbing"
          style={{ backgroundColor: columnColor }}
          {...attributes}
          {...listeners}
        >
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-white drop-shadow-sm">{column.name}</h3>
            <span className="text-xs text-white/80 drop-shadow-sm">{columnTasks.length} tasks</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 hover:bg-white/20 text-white">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openColumnDialog(column)}>
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div 
          ref={setDroppableRef}
          className={`space-y-2 p-2 bg-muted/30 rounded-b-lg min-h-[200px] flex-1 transition-colors ${
            isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''
          }`}
        >
          <SortableContext
            items={[
              ...columnTasks.map(t => t._id),
              ...columnTasks.flatMap(t => (subtasksByParent[t._id] || []).map(st => st._id))
            ]}
            strategy={verticalListSortingStrategy}
          >
            {columnTasks.map((task) => (
              <KanbanCard 
                key={task._id} 
                task={task} 
                subtasks={subtasksByParent[task._id] || []}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    );
  };

  const renderKanbanView = () => {
    const columns = kanbanColumns || [];
    const allTasks = tasks || [];

    // Separate parent tasks and subtasks
    const parentTasks = allTasks.filter(t => !t.parentTaskId);
    const subtasksByParent = allTasks.reduce((acc, task) => {
      if (task.parentTaskId) {
        if (!acc[task.parentTaskId]) {
          acc[task.parentTaskId] = [];
        }
        acc[task.parentTaskId].push(task);
      }
      return acc;
    }, {} as Record<string, any[]>);

    // Sort tasks based on selected mode
    const sortTasks = (tasksToSort: typeof allTasks) => {
      if (sortMode === "manual") {
        return [...tasksToSort].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      } else if (sortMode === "priority") {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return [...tasksToSort].sort((a, b) => {
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
          return aPriority - bPriority;
        });
      } else if (sortMode === "startDate") {
        return [...tasksToSort].sort((a, b) => {
          const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
          return aDate - bDate;
        });
      } else if (sortMode === "dueDate") {
        return [...tasksToSort].sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      }
      return tasksToSort;
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Sort by:</label>
            <Select value={sortMode} onValueChange={(value: "manual" | "priority" | "startDate" | "dueDate") => setSortMode(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Order</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="dueDate">Due Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Subtask Status:</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Done</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Review</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Blocked</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span>To Do</span>
            </div>
          </div>
        </div>
        <DndContext
          key={`kanban-${filters.search}-${filters.status}-${filters.priority}-${filters.assigneeId}-${filters.tagId}-${(filters.tagIds || []).join(',')}`}
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={(event) => {
            const columns = kanbanColumns || [];
            // Check if dragging a column or a task
            const draggedColumn = columns.find(col => 
              ('_id' in col ? col._id : col.statusKey) === event.active.id
            );
            if (draggedColumn) {
              handleColumnDragStart(event);
            } else {
              handleDragStart(event);
            }
          }}
          onDragEnd={(event) => {
            const columns = kanbanColumns || [];
            // Check if dragging a column or a task
            const draggedColumn = columns.find(col => 
              ('_id' in col ? col._id : col.statusKey) === event.active.id
            );
            if (draggedColumn) {
              handleColumnDragEnd(event);
            } else {
              handleDragEnd(event);
            }
          }}
        >
          <SortableContext
            items={columns.map(col => '_id' in col ? col._id : col.statusKey)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {columns.map((column) => {
                const columnParentTasks = sortTasks(parentTasks.filter(t => t.status === column.statusKey));
                return (
                  <KanbanColumn 
                    key={'_id' in column ? column._id : column.statusKey}
                    column={column}
                    columnTasks={columnParentTasks}
                    subtasksByParent={subtasksByParent}
                  />
                );
              })}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeColumnId ? (
              <div className="bg-muted p-3 rounded-lg border shadow-lg opacity-90">
                <h3 className="font-semibold text-sm">Moving column...</h3>
              </div>
            ) : activeId ? (
              <Card className="p-3 shadow-lg opacity-90">
                <h4 className="font-medium text-sm">Dragging task...</h4>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    );
  };

  const renderTimelineView = () => {
    const tasksWithDates = (tasks || []).filter(t => t.startDate || t.dueDate);
    
    if (tasksWithDates.length === 0) {
      return (
        <div className="space-y-4">
          <div className="text-center text-muted-foreground py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tasks with dates</p>
            <p className="text-sm mt-2">Add start or due dates to tasks to see them in the timeline</p>
          </div>
        </div>
      );
    }

    // Group tasks by month
    const tasksByMonth = tasksWithDates.reduce((acc, task) => {
      const date = new Date(task.startDate || task.dueDate!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(task);
      return acc;
    }, {} as Record<string, typeof tasksWithDates>);

    const sortedMonths = Object.keys(tasksByMonth).sort();

    return (
      <div className="space-y-6">
        {sortedMonths.map((monthKey) => {
          const [year, month] = monthKey.split('-');
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { 
            month: 'long', 
            year: 'numeric',
            timeZone: 'America/Sao_Paulo'
          });
          const monthTasks = tasksByMonth[monthKey].sort((a, b) => {
            const dateA = a.startDate || a.dueDate!;
            const dateB = b.startDate || b.dueDate!;
            return dateA - dateB;
          });

          return (
            <div key={monthKey} className="space-y-3">
              <h3 className="text-lg font-semibold text-primary border-b pb-2">{monthName}</h3>
              <div className="space-y-2">
                {monthTasks.map((task) => (
                  <Card 
                    key={task._id} 
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openEditDialog(task)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(task.status)}
                          <h4 className="font-medium">{task.title}</h4>
                        </div>
                        {task.parentTaskId && (() => {
                          const parentTask = tasks?.find((t: any) => t._id === task.parentTaskId);
                          return (
                            <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                              <span>Subtask of:</span>
                              {parentTask ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(parentTask);
                                  }}
                                  className="text-primary hover:underline font-medium"
                                >
                                  {parentTask.title}
                                </button>
                              ) : (
                                <span className="text-muted-foreground italic">(Parent task not found)</span>
                              )}
                            </div>
                          );
                        })()}
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.assigneeId && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              Assigned
                            </span>
                          )}
                          <TaskTagsDisplay taskId={task._id} />
                        </div>
                      </div>
                      <div className="text-right text-sm space-y-1">
                        {task.startDate && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="text-xs">Start:</span>
                            <span className="font-medium">{new Date(task.startDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="text-xs">Due:</span>
                            <span className="font-medium">{new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                          </div>
                        )}
                        {task.startDate && task.dueDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Duration: {Math.ceil((task.dueDate - task.startDate) / (1000 * 60 * 60 * 24))} days
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGanttView = () => {
    // Get all tasks with dates for parent-level filtering
    const allTasksWithDates = (tasks || []).filter(t => t.startDate && t.dueDate);
    
    // Recursive function to add task and its nested subtasks
    const addTaskWithSubtasks = (task: any, tasksArray: any[]) => {
      tasksArray.push(task);
      
      // If task is expanded, recursively add ALL its subtasks (even without dates)
      if (expandedTasks.has(task._id)) {
        const subtasks = (tasks || []).filter(t => t.parentTaskId === task._id);
        subtasks.forEach(subtask => {
          addTaskWithSubtasks(subtask, tasksArray);
        });
      }
    };
    
    // Build hierarchical task list: parent tasks followed by their nested subtasks if expanded
    const tasksWithDates: any[] = [];
    const parentTasks = allTasksWithDates.filter(t => !t.parentTaskId);
    
    parentTasks.forEach(parent => {
      addTaskWithSubtasks(parent, tasksWithDates);
    });
    
    if (tasksWithDates.length === 0) {
      return (
        <div className="space-y-4">
          <div className="text-center text-muted-foreground py-12">
            <GanttChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tasks with both start and due dates</p>
            <p className="text-sm mt-2">Add start and due dates to tasks to see them in the Gantt chart</p>
          </div>
        </div>
      );
    }

    // Build task index map for quick lookup
    const taskIndexMap = new Map<string, number>();
    tasksWithDates.forEach((task, index) => {
      taskIndexMap.set(task._id, index);
    });

    // Sort tasks by start date to determine execution order
    const sortedTasksByStartDate = [...tasksWithDates].sort((a, b) => {
      return (a.startDate || 0) - (b.startDate || 0);
    });

    // Calculate date range for the chart
    const allDates = tasksWithDates.flatMap(t => [t.startDate!, t.dueDate!]);
    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    const dayInMs = 1000 * 60 * 60 * 24;
    
    // Generate all days in the range - ensure full months are shown
    const startDate = new Date(minDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(maxDate);
    endDate.setDate(1); // Set to 1st to avoid overflow issues when changing month
    endDate.setMonth(endDate.getMonth() + 1); // Go to next month
    endDate.setDate(0); // Go back one day to get last day of original month
    endDate.setHours(0, 0, 0, 0);
    
    const allDays: Array<{ date: Date; dayOfMonth: number; isFirstOfMonth: boolean; monthName: string; monthYear: string }> = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const isFirstOfMonth = currentDate.getDate() === 1;
      const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      allDays.push({
        date: new Date(currentDate),
        dayOfMonth: currentDate.getDate(),
        isFirstOfMonth,
        monthName: currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' }),
        monthYear: monthYear
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Group days by month for headers - using monthYear for accurate grouping
    const monthGroups: Array<{ name: string; dayCount: number }> = [];
    
    if (allDays.length > 0) {
      // Create a map to count days per month using the date's actual month/year
      const monthMap = new Map<string, { name: string; days: number }>();
      
      allDays.forEach((day) => {
        // Use the actual year and month from the date object
        const year = day.date.getFullYear();
        const month = day.date.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        if (!monthMap.has(monthKey)) {
          const monthName = day.date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
          monthMap.set(monthKey, {
            name: monthName,
            days: 0
          });
        }
        monthMap.get(monthKey)!.days++;
      });
      
      // Convert map to array in chronological order
      const sortedMonthKeys = Array.from(monthMap.keys()).sort();
      sortedMonthKeys.forEach(key => {
        const monthData = monthMap.get(key)!;
        monthGroups.push({
          name: monthData.name,
          dayCount: monthData.days
        });
      });
    }

    const totalDays = allDays.length;

    // Calculate task bar positions
    const getTaskBarStyle = (task: any) => {
      const taskStart = new Date(task.startDate!);
      taskStart.setHours(0, 0, 0, 0);
      const taskEnd = new Date(task.dueDate!);
      taskEnd.setHours(23, 59, 59, 999);
      
      const startDayIndex = Math.floor((taskStart.getTime() - startDate.getTime()) / dayInMs);
      const endDayIndex = Math.floor((taskEnd.getTime() - startDate.getTime()) / dayInMs);
      const duration = endDayIndex - startDayIndex + 1;
      
      const leftPx = startDayIndex * 24;
      const widthPx = duration * 24;
      
      return {
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      };
    };

    const getPriorityColorForBar = (priority: string) => {
      switch (priority) {
        case TASK_PRIORITY.URGENT:
          return "#ef4444";
        case TASK_PRIORITY.HIGH:
          return "#f97316";
        case TASK_PRIORITY.MEDIUM:
          return "#eab308";
        default:
          return "#6b7280";
      }
    };

    return (
      <div className="space-y-4">
        <div className="relative border rounded-lg overflow-hidden">
          {/* Two-column layout: Fixed task column + Scrollable timeline */}
          <div className="flex">
            {/* Fixed Task Column */}
            <div className="w-64 flex-shrink-0 border-r bg-background">
              {/* Month header placeholder - matches right side month header height */}
              <div className="p-2 font-medium border-b bg-muted/50 text-center text-sm" style={{ height: '41px', minHeight: '41px' }}>Task</div>
              
              {/* Day header placeholder - matches right side day header height */}
              <div className="border-b bg-muted/30 text-xs py-1 px-0.5 text-center" style={{ height: '28px', minHeight: '28px' }}>&nbsp;</div>
              
              {/* Task rows */}
              <div>
                {tasksWithDates.map((task) => (
                  <div
                    key={task._id}
                    className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer flex items-center"
                    style={{ height: "60px", minHeight: "60px", maxHeight: "60px" }}
                    onClick={() => openEditDialog(task)}
                  >
                    <div className="flex items-center gap-2 px-3 w-full h-full">
                      {getTaskSubtasks(task._id, tasks).length > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskExpansion(task._id);
                          }}
                          className="hover:bg-muted rounded p-0.5 flex-shrink-0"
                        >
                          {expandedTasks.has(task._id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <div className="w-4 flex-shrink-0" />
                      )}
                      <div className="flex-shrink-0">
                        {getStatusIcon(task.status)}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center py-2">
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className={`font-medium text-sm truncate ${task.parentTaskId ? 'ml-2' : ''}`}>{task.title}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{task.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.assigneeName && (
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {task.assigneeName}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{task.assigneeName}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {task.parentTaskId && (() => {
                            const parentTask = tasks?.find((t: any) => t._id === task.parentTaskId);
                            return parentTask ? (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate flex items-center gap-1">
                                      <span>↳</span>
                                      <span className="truncate max-w-[80px]">{parentTask.title}</span>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Subtask of: {parentTask.title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable Timeline Column */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ minWidth: `${totalDays * 24}px` }}>
                {/* Month headers */}
                <div className="flex border-b bg-muted/50" style={{ height: '41px', minHeight: '41px' }}>
                  {monthGroups.map((month, idx) => (
                    <div
                      key={idx}
                      className="border-r last:border-r-0 p-2 text-center text-sm font-medium flex items-center justify-center"
                      style={{ 
                        width: `${month.dayCount * 24}px`,
                        minWidth: `${month.dayCount * 24}px`,
                        flexShrink: 0
                      }}
                    >
                      {month.name}
                    </div>
                  ))}
                </div>

                {/* Day headers */}
                <div className="flex border-b bg-muted/30" style={{ height: '28px', minHeight: '28px' }}>
                  {allDays.map((day, idx) => (
                    <div
                      key={idx}
                      className="border-r last:border-r-0 text-center text-xs py-1 px-0.5 flex items-center justify-center"
                      style={{ 
                        width: '24px',
                        minWidth: '24px',
                        flexShrink: 0
                      }}
                    >
                      {day.dayOfMonth}
                    </div>
                  ))}
                </div>

                {/* Task bars with grid overlay */}
                <div className="relative">
                  {/* Task bars */}
                  {tasksWithDates.map((task, taskIndex) => (
                    <div
                      key={task._id}
                      className="relative border-b border-border hover:bg-muted/30 transition-colors"
                      style={{ height: "60px", minHeight: "60px", maxHeight: "60px" }}
                    >
                      {/* Vertical grid lines for this row */}
                      <div className="absolute inset-0 flex pointer-events-none" style={{ zIndex: 0 }}>
                        {allDays.map((day, idx) => (
                          <div
                            key={`grid-${taskIndex}-${idx}`}
                            className="border-r border-border/30"
                            style={{ 
                              width: '24px',
                              minWidth: '24px',
                              flexShrink: 0,
                              height: '100%'
                            }}
                          />
                        ))}
                      </div>
                      
                      {/* Task bar */}
                      <div className="relative h-full" style={{ minWidth: `${totalDays * 24}px`, zIndex: 1 }}>
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-10 rounded shadow-sm hover:shadow-md transition-shadow flex items-center justify-center px-3 gap-2"
                          style={{
                            ...getTaskBarStyle(task),
                            backgroundColor: getPriorityColorForBar(task.priority),
                          }}
                        >
                          <span
                            className="text-white text-sm font-semibold drop-shadow-md truncate whitespace-nowrap"
                            style={{
                              textShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)',
                              minWidth: 'fit-content',
                              display: 'block'
                            }}
                          >
                            {task.assigneeName || 'Não atribuído'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
          <span className="font-medium">Priority:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ef4444" }} />
            <span>Urgent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#f97316" }} />
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#eab308" }} />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#6b7280" }} />
            <span>Low</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryView = () => {
    const allTasks = tasks || [];
    const totalTasks = allTasks.length;
    const hasTasks = totalTasks > 0;
    const completedTasks = allTasks.filter(t => t.status === TASK_STATUS.DONE).length;
    const inProgressTasks = allTasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length;
    const reviewTasks = allTasks.filter(t => t.status === TASK_STATUS.REVIEW).length;
    const blockedTasks = allTasks.filter(t => t.status === TASK_STATUS.BLOCKED).length;
    const todoTasks = allTasks.filter(t => t.status === TASK_STATUS.TODO).length;
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const urgentTasks = allTasks.filter(t => t.priority === TASK_PRIORITY.URGENT).length;
    const highPriorityTasks = allTasks.filter(t => t.priority === TASK_PRIORITY.HIGH).length;
    
    const tasksWithDates = allTasks.filter(t => t.dueDate);
    const overdueTasks = tasksWithDates.filter(t => t.dueDate! < Date.now() && t.status !== TASK_STATUS.DONE).length;
    
    const assignedTasks = allTasks.filter(t => t.assigneeId).length;
    const unassignedTasks = totalTasks - assignedTasks;
    
    const parentTasksCount = allTasks.filter(t => !t.parentTaskId).length;
    const subtasksCount = allTasks.filter(t => t.parentTaskId).length;

    // Calculate total days until delivery for parent tasks only (excluding completed)
    const parentTasksWithDates = allTasks.filter(t => !t.parentTaskId && t.dueDate && t.status !== TASK_STATUS.DONE);
    const totalDaysUntilDelivery = parentTasksWithDates.reduce((sum, task) => {
      const daysRemaining = Math.ceil((task.dueDate! - Date.now()) / (1000 * 60 * 60 * 24));
      return sum + daysRemaining; // Include all days (positive or negative)
    }, 0);
    const parentTasksWithDatesCount = parentTasksWithDates.length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumo</p>
            <h3 className="text-xl font-bold text-foreground">Visão geral do projeto</h3>
            <p className="text-sm text-muted-foreground">
              Exporte a lista de tarefas ou acompanhe seus principais indicadores.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={downloadTasksAsExcel}
            disabled={!hasTasks}
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar lista em Excel
          </Button>
        </div>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Breakdown</CardTitle>
            <CardDescription>Distribution of tasks by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">To Do</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-muted rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full transition-all" 
                      style={{ width: `${totalTasks > 0 ? (todoTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">{todoTasks}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">In Progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-muted rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all" 
                      style={{ width: `${totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">{inProgressTasks}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Review</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-muted rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all" 
                      style={{ width: `${totalTasks > 0 ? (reviewTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">{reviewTasks}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Done</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-muted rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all" 
                      style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">{completedTasks}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Blocked</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-muted rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all" 
                      style={{ width: `${totalTasks > 0 ? (blockedTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">{blockedTasks}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Status</CardTitle>
              <CardDescription>Task assignment distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Assigned</span>
                  <span className="text-sm font-bold">{assignedTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Unassigned</span>
                  <span className="text-sm font-bold text-orange-600">{unassignedTasks}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Timeline</CardTitle>
              <CardDescription>Key dates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.startDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Start Date</span>
                    <span className="text-sm font-bold">
                      {new Date(project.startDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </span>
                  </div>
                )}
                {project.endDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">End Date</span>
                    <span className="text-sm font-bold">
                      {new Date(project.endDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </span>
                  </div>
                )}
                {!project.startDate && !project.endDate && (
                  <p className="text-sm text-muted-foreground">No timeline set</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Tasks List */}
        {overdueTasks > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Overdue Tasks</CardTitle>
              <CardDescription>{overdueTasks} tasks require immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasksWithDates
                  .filter(t => t.dueDate! < Date.now() && t.status !== TASK_STATUS.DONE)
                  .map((task) => {
                    const daysOverdue = Math.ceil((Date.now() - task.dueDate!) / (1000 * 60 * 60 * 24));
                    return (
                      <div 
                        key={task._id} 
                        className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer"
                        onClick={() => openEditDialog(task)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <p className="text-sm font-medium truncate">{task.title}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Due: {new Date(task.dueDate!).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                            <span>•</span>
                            <span className="text-red-600 font-medium">{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue</span>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-sm font-medium">
                            {task.assigneeId ? "Assigned" : <span className="text-orange-600">Unassigned</span>}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members - Project Members */}
        {projectMembers && projectMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Team Members</CardTitle>
              <CardDescription>{projectMembers.length} members in this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projectMembers.map((member: any) => {
                  const memberUserId = member.user?._id || member.userId;
                  const memberTasks = allTasks.filter(t => t.assigneeId === memberUserId);
                  const memberCompletedTasks = memberTasks.filter(t => t.status === TASK_STATUS.DONE).length;
                  
                  return (
                    <div key={memberUserId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.user?.name || member.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.user?.email || member.email || ""}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-bold">{memberTasks.length}</p>
                        <p className="text-xs text-muted-foreground">
                          {memberCompletedTasks} done
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Cost Summary */}
        {allTasks && allTasks.length > 0 && (() => {
          // Helper function to calculate hours from dates
          const calculateHoursFromDates = (task: any): number | null => {
            if (!task.startDate || !task.dueDate) return null;
            const diffMs = task.dueDate - task.startDate;
            const diffHours = Math.round(diffMs / (1000 * 60 * 60));
            return diffHours > 0 ? diffHours : null;
          };

          // Helper function to get best available hours
          const getTaskHours = (task: any): { hours: number; type: 'calculated' | 'estimated' | 'none' } => {
            const calculatedHours = calculateHoursFromDates(task);
            if (calculatedHours !== null) {
              return { hours: calculatedHours, type: 'calculated' };
            }
            if (task.estimatedHours && task.estimatedHours > 0) {
              return { hours: task.estimatedHours, type: 'estimated' };
            }
            return { hours: 0, type: 'none' };
          };

          const tasksWithCost = allTasks.filter((task: any) => task.estimatedCost && task.estimatedCost > 0);
          const totalCost = tasksWithCost.reduce((sum: number, task: any) => sum + (task.estimatedCost || 0), 0);
          const totalHours = tasksWithCost.reduce((sum: number, task: any) => {
            const { hours } = getTaskHours(task);
            return sum + hours;
          }, 0);
          const totalEstimatedHours = tasksWithCost.reduce((sum: number, task: any) => sum + (task.estimatedHours || 0), 0);

          return (
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Custos por Tarefa</CardTitle>
                <CardDescription>
                  Acompanhe os custos estimados e horas reais de cada tarefa do projeto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Cards */}
                {tasksWithCost.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Custo Total</p>
                          <p className="text-2xl font-bold text-primary">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(totalCost)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Horas Calculadas</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {totalHours > 0 ? `${totalHours}h` : '-'}
                          </p>
                          {totalEstimatedHours > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Est: {totalEstimatedHours}h
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Tarefas com Custo</p>
                          <p className="text-2xl font-bold text-green-600">
                            {tasksWithCost.length}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Custo/Hora</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {totalHours > 0 ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(totalCost / totalHours) : '-'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Tasks Table */}
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full border-collapse">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold text-sm">Tarefa</th>
                        <th className="text-left p-3 font-semibold text-sm">Responsável</th>
                        <th className="text-center p-3 font-semibold text-sm">Status</th>
                        <th className="text-right p-3 font-semibold text-sm">Horas</th>
                        <th className="text-right p-3 font-semibold text-sm">Custo Estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasksWithCost.length > 0 ? (
                        tasksWithCost.map((task: any) => (
                          <tr
                            key={task._id}
                            className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => openEditDialog(task)}
                          >
                            <td className="p-3">
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {task.assigneeName ? task.assigneeName.charAt(0).toUpperCase() : '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                  {task.assigneeName || "Não atribuído"}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant="secondary"
                                className={`
                                  ${task.status === TASK_STATUS.DONE ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                                  ${task.status === TASK_STATUS.IN_PROGRESS ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : ""}
                                  ${task.status === TASK_STATUS.REVIEW ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : ""}
                                  ${task.status === TASK_STATUS.BLOCKED ? "bg-red-100 text-red-800 hover:bg-red-100" : ""}
                                  ${task.status === TASK_STATUS.TODO ? "bg-gray-100 text-gray-800 hover:bg-gray-100" : ""}
                                `}
                              >
                                {statusLabelMap[task.status] || task.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              {(() => {
                                const { hours, type } = getTaskHours(task);
                                if (type === 'none') return <span className="text-muted-foreground">-</span>;

                                return (
                                  <div className="flex flex-col items-end">
                                    <span className="font-medium">
                                      {hours}h
                                    </span>
                                    {type === 'calculated' && (
                                      <span className="text-xs text-blue-600">
                                        calculado
                                      </span>
                                    )}
                                    {type === 'estimated' && (
                                      <span className="text-xs text-orange-600">
                                        estimado
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-semibold text-primary">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(task.estimatedCost || 0)}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
                              <p className="text-sm text-muted-foreground">
                                Nenhuma tarefa com custo estimado
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {tasksWithCost.length > 0 && (
                      <tfoot className="bg-muted/80 border-t-2 border-primary/20">
                        <tr>
                          <td colSpan={3} className="p-4 text-right font-bold text-base">
                            Total do Projeto:
                          </td>
                          <td className="p-4 text-right font-bold">
                            {totalHours > 0 ? `${totalHours}h` : "-"}
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-lg font-bold text-primary">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(totalCost)}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    );
  };

  const handleUpdateProject = async (updates: Partial<typeof project>) => {
    if (!project) return;
    try {
      // Only pass allowed fields to the mutation
      const allowedUpdates: any = { id: project._id };
      if (updates.name !== undefined) allowedUpdates.name = updates.name;
      if (updates.color !== undefined) allowedUpdates.color = updates.color;
      if (updates.status !== undefined) allowedUpdates.status = updates.status as "in_progress" | "paused" | "finished";
      if (updates.description !== undefined) allowedUpdates.description = updates.description;
      if (updates.managerId !== undefined) allowedUpdates.managerId = updates.managerId;
      if (updates.startDate !== undefined) allowedUpdates.startDate = updates.startDate;
      if (updates.endDate !== undefined) allowedUpdates.endDate = updates.endDate;
      if (updates.teamRestricted !== undefined) allowedUpdates.teamRestricted = updates.teamRestricted;
      if (updates.allowedTeamIds !== undefined) allowedUpdates.allowedTeamIds = updates.allowedTeamIds;

      await updateProject(allowedUpdates);
      toast.success("Project updated successfully");
    } catch (error) {
      toast.error("Failed to update project");
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    try {
                await deleteProject({ id: project._id });
      toast.success("Project deleted");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="flex h-16 items-center gap-4 px-6 max-w-[98%] mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
              <p className="text-xs text-muted-foreground">Owner: {project.ownerName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={canCreateTasks === false}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('tasks.newTask')}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setShowProjectSettings(true);
                setSettingsTab("members");
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              {t('tasks.settings')}
            </Button>
            
            <Button
              variant="destructive"
              onClick={(e) => {
                console.log("=== DELETE BUTTON CLICKED - INLINE ===");
                console.log("Event:", e);
                console.log("Target:", e.target);
                console.log("CurrentTarget:", e.currentTarget);
                handleDelete();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('tasks.delete')}
            </Button>
          </div>
        </div>
      </header>

      {/* Create/Edit Task Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
      }}>
        <DialogContent className="w-[85vw] max-w-[1400px] sm:max-w-[1400px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? t('tasks.editTask') : isSubtaskDialog ? t('tasks.createSubtask') : t('tasks.createTask')}
            </DialogTitle>
            <DialogDescription>
              {editingTask ? t('tasks.updateTaskDetails') : t('tasks.addNewTask')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <Label htmlFor="taskTitle">{t('tasks.title')}</Label>
              <Input
                id="taskTitle"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={t('tasks.taskTitle')}
                required
              />
            </div>
            <div>
              <Label htmlFor="taskDescription">{t('tasks.description')}</Label>
              <Textarea
                id="taskDescription"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder={t('tasks.taskDescription')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taskStatus">{t('tasks.status')}</Label>
                <Select value={taskStatus} onValueChange={(value) => setTaskStatus(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TASK_STATUS.TODO}>{t('tasks.toDo')}</SelectItem>
                    <SelectItem value={TASK_STATUS.IN_PROGRESS}>{t('tasks.inProgress')}</SelectItem>
                    <SelectItem value={TASK_STATUS.REVIEW}>{t('tasks.review')}</SelectItem>
                    <SelectItem value={TASK_STATUS.DONE}>{t('tasks.done')}</SelectItem>
                    <SelectItem value={TASK_STATUS.BLOCKED}>{t('tasks.blocked')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="taskPriority">{t('tasks.priority')}</Label>
                <Select value={taskPriority} onValueChange={(value) => setTaskPriority(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TASK_PRIORITY.LOW}>{t('tasks.low')}</SelectItem>
                    <SelectItem value={TASK_PRIORITY.MEDIUM}>{t('tasks.medium')}</SelectItem>
                    <SelectItem value={TASK_PRIORITY.HIGH}>{t('tasks.high')}</SelectItem>
                    <SelectItem value={TASK_PRIORITY.URGENT}>{t('tasks.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taskStartDate">{t('tasks.startDate')}</Label>
                <Input
                  id="taskStartDate"
                  type="date"
                  value={taskStartDate}
                  onChange={(e) => setTaskStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="taskDueDate">{t('tasks.dueDate')}</Label>
                <Input
                  id="taskDueDate"
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Task Cost Tracking */}
            {editingTask && (
              <div>
                <Label htmlFor="taskEstimatedCost">{t('tasks.estimatedCost')}</Label>
                <Input
                  id="taskEstimatedCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={taskEstimatedCost}
                  onChange={(e) => setTaskEstimatedCost(e.target.value)}
                  placeholder="0,00"
                />
                {taskEstimatedCost && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(taskEstimatedCost)}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="taskAssignee">{t('tasks.assignee')}</Label>
              <Select
                value={taskAssignee || "none"}
                onValueChange={(value) => setTaskAssignee(value === "none" ? undefined : value as Id<"users">)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.selectAssignee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('tasks.noAssignee')}</SelectItem>
                  {assignableOptions.map((user: any) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show tabs for both create and edit modes */}
            {(editingTask || isCreateDialogOpen) && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="details">{t('tasks.details')}</TabsTrigger>
                  <TabsTrigger value="checklist">{t('tasks.checklist')}</TabsTrigger>
                  <TabsTrigger value="tags">{t('tasks.tags')}</TabsTrigger>
                  <TabsTrigger value="attachments">{t('tasks.attachments')}</TabsTrigger>
                  {editingTask && <TabsTrigger value="dependencies">{t('tasks.dependencies')}</TabsTrigger>}
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div>
                    <Label>{t('tasks.comments')}</Label>
                    <div className="space-y-2 mt-2">
                      {comments.map((comment, idx) => (
                        <div key={comment._id || idx} className="p-2 border rounded flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{comment.userName}</p>
                            <p className="text-sm text-muted-foreground">{comment.body}</p>
                          </div>
                          {comment._id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await deleteComment({ commentId: comment._id });
                                  toast.success("Comment deleted");
                                } catch (error: any) {
                                  toast.error(error.message || "Failed to delete comment");
                                }
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={t('tasks.addComment')}
                        />
                        <Button type="button" onClick={handleAddComment}>{t('tasks.add')}</Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="checklist" className="space-y-4">
                  <div>
                    <Label>{t('tasks.checklistItems')}</Label>
                    <div className="space-y-2 mt-2">
                      {checklistItems.map((item) => (
                        <div key={item._id} className="flex items-center gap-2">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => handleToggleChecklistItem(item._id, item.completed)}
                          />
                          <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                            {item.text}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteChecklistItem(item._id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          placeholder={t('tasks.addChecklistItem')}
                        />
                        <Button type="button" onClick={handleAddChecklistItem}>{t('tasks.add')}</Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tags" className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('tasks.tags')}</Label>
                    {editingTask && <TaskTagsDisplay taskId={editingTask} showDelete={true} />}
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value === "create-new") {
                          setIsCreateTagDialogOpen(true);
                        } else if (editingTask) {
                          addTagToTask({
                            taskId: editingTask,
                            tagId: value as Id<"tags">,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('tasks.addTag')} />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTags?.map((tag: any) => (
                          <SelectItem key={tag._id} value={tag._id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="create-new">
                          <div className="flex items-center gap-2 font-medium text-primary">
                            <Plus className="h-4 w-4" />
                            {t('tasks.createNewTag')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="space-y-4">
                  <div>
                    <Label>{t('tasks.attachments')}</Label>
                    {!editingTask && (
                      <p className="text-sm text-muted-foreground mt-1 mb-2">
                        {t('tasks.saveTaskFirst')}
                      </p>
                    )}
                    <div className="space-y-2 mt-2">
                      {editingTask && attachments.map((attachment) => (
                        <div key={attachment._id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{attachment.fileName}</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatFileSize(attachment.fileSize)})
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {attachment.url && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(attachment.url, "_blank")}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAttachment(attachment._id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {editingTask && (
                        <div className="flex gap-2">
                          <Input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            disabled={isUploading}
                          />
                          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {editingTask && (
                  <TabsContent value="dependencies" className="space-y-4">
                    <TaskDependencyManager 
                      taskId={editingTask} 
                      projectId={projectId as Id<"projects">} 
                    />
                  </TabsContent>
                )}
              </Tabs>
            )}

            <div className="flex justify-end gap-2 w-full">
              {editingTask && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setTaskToDelete(editingTask);
                    setIsDeleteDialogOpen(true);
                    resetForm();
                  }}
                  className="mr-auto"
                >
                  {t('tasks.delete')}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={resetForm}>
                {t('tasks.cancel')}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTask ? t('tasks.saveChanges') : t('tasks.createTask')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Column Management Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColumn ? "Edit Column" : "Create Column"}</DialogTitle>
            <DialogDescription>
              {editingColumn ? "Update the column name and color" : "Add a new status column to your Kanban board"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrUpdateColumn} className="space-y-4">
            <div>
              <Label htmlFor="columnName">Column Name</Label>
              <Input
                id="columnName"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="In Development"
                required
              />
            </div>
            <div>
              <Label htmlFor="columnColor">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="columnColor"
                  type="color"
                  value={columnColor}
                  onChange={(e) => setColumnColor(e.target.value)}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{columnColor}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsColumnDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isColumnCreating}>
                {isColumnCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingColumn ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Column Confirmation Dialog */}
      <Dialog open={isDeleteColumnDialogOpen} onOpenChange={setIsDeleteColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Column</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this column? All tasks in this column will be moved to "To Do". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteColumn}>
              Delete Column
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={isDeleteProjectDialogOpen} onOpenChange={setIsDeleteProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This will permanently delete all tasks, comments, attachments, and other project data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteProject}>
              Delete Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={isCreateTagDialogOpen} onOpenChange={setIsCreateTagDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Create new tags or delete existing ones
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Existing Tags Section */}
            <div>
              <Label className="text-base font-semibold">Existing Tags</Label>
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {projectTags && projectTags.length > 0 ? (
                  projectTags.map((tag: any) => (
                    <div
                      key={tag._id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium">{tag.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteTag(tag._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No tags created yet
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Create New Tag Section */}
            <form onSubmit={handleCreateTag} className="space-y-4">
              <Label className="text-base font-semibold">Create New Tag</Label>
              <div>
                <Label htmlFor="tagName">Tag Name</Label>
                <Input
                  id="tagName"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., Bug, Feature, Documentation"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tagColor">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tagColor"
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <span className="text-sm text-muted-foreground">{newTagColor}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateTagDialogOpen(false);
                    setNewTagName("");
                    setNewTagColor("#3b82f6");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create Tag
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Settings Dialog */}
      <Dialog open={showProjectSettings} onOpenChange={setShowProjectSettings}>
        <DialogContent 
          className="max-h-[90vh] overflow-y-auto"
          style={{ width: '50vw', maxWidth: '50vw', minWidth: '50vw' }}
        >
          <DialogHeader>
            <DialogTitle>{t('tasks.projectSettings')}</DialogTitle>
          </DialogHeader>

          {canAccessSettings ? (
            <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as "access" | "transfer" | "members")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="access">{t('tasks.taskAccessControl')}</TabsTrigger>
                <TabsTrigger value="transfer">{t('tasks.transferManagement')}</TabsTrigger>
                <TabsTrigger value="members">{t('tasks.members')}</TabsTrigger>
              </TabsList>

              <TabsContent value="access" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Select Task</Label>
                    <Select
                      value={selectedTaskForAccess || ""}
                      onValueChange={(value) => setSelectedTaskForAccess(value as Id<"tasks">)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks?.map((task) => (
                          <SelectItem key={task._id} value={task._id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTaskForAccess && taskPermissions && taskPermissions.length > 0 && (
                    <div className="space-y-2">
                      <Label>Current Access Permissions</Label>
                      <div className="border rounded-lg divide-y">
                        {taskPermissions.map((permission) => (
                          <div key={permission._id} className="p-3 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{permission.userName}</p>
                              <p className="text-sm text-muted-foreground">{permission.userEmail}</p>
                              <div className="flex gap-2 mt-1">
                                {permission.canView && (
                                  <Badge variant="secondary" className="text-xs">Can View</Badge>
                                )}
                                {permission.canEdit && (
                                  <Badge variant="secondary" className="text-xs">Can Edit</Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                try {
                                  await revokeTaskAccess({
                                    permissionId: permission._id,
                                  });
                                  toast.success("Access revoked successfully");
                                } catch (error) {
                                  toast.error("Failed to revoke access");
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTaskForAccess && (
                    <>
                      <div>
                        <Label>Select User</Label>
                        <Select
                          value={selectedUserForAccess || ""}
                          onValueChange={(value) => setSelectedUserForAccess(value as Id<"users">)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableOptions.map((user: any) => (
                              <SelectItem key={user._id} value={user._id}>
                                {user.name} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="canView"
                            checked={canView}
                            onCheckedChange={(checked) => setCanView(checked as boolean)}
                          />
                          <Label htmlFor="canView">Can View</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="canEdit"
                            checked={canEdit}
                            onCheckedChange={(checked) => setCanEdit(checked as boolean)}
                          />
                          <Label htmlFor="canEdit">Can Edit</Label>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            if (!selectedUserForAccess) return;
                            try {
                              await grantAccessMutation({
                                taskId: selectedTaskForAccess!,
                                userId: selectedUserForAccess,
                                canView,
                                canEdit,
                                isBlocked: false,
                              });
                              setSelectedUserForAccess(null);
                              toast.success("Access granted successfully");
                            } catch (error) {
                              toast.error("Failed to grant access");
                            }
                          }}
                          disabled={!selectedUserForAccess}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Grant Access
                        </Button>
                        
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            if (!selectedUserForAccess) return;
                            try {
                              await blockUserMutation({
                                taskId: selectedTaskForAccess!,
                                userId: selectedUserForAccess,
                              });
                              setSelectedUserForAccess(null);
                              toast.success("User blocked from task");
                            } catch (error) {
                              toast.error("Failed to block user");
                            }
                          }}
                          disabled={!selectedUserForAccess}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Block User
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="transfer" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>New Project Manager</Label>
                    <Select
                      value={newManagerId || ""}
                      onValueChange={(value) => setNewManagerId(value as Id<"users">)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select new manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableOptions.map((user: any) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={async () => {
                      if (!newManagerId) return;
                      try {
                        await updateProject({
                          id: projectId as Id<"projects">,
                          managerId: newManagerId,
                        });
                        setNewManagerId(null);
                        setShowProjectSettings(false);
                        toast.success("Project manager updated successfully");
                      } catch (error) {
                        toast.error("Failed to update project manager");
                      }
                    }}
                    disabled={!newManagerId}
                  >
                    Transfer Management
                  </Button>

                  <div className="rounded-lg border border-border/60 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold">Histórico de transferências</p>
                      <p className="text-sm text-muted-foreground">
                        Acompanhe quem assumiu a gestão deste projeto.
                      </p>
                    </div>
                    {managerHistory && managerHistory.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {managerHistory && managerHistory.length > 0 ? (
                          managerHistory.map((entry: any) => (
                            <div
                              key={entry._id}
                              className="rounded-md border border-border/50 bg-muted/40 p-3 space-y-1"
                            >
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-medium">
                                  {entry.previousManagerName} → {entry.newManagerName}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Atualizado por {entry.changedBy}
                              </p>
                            </div>
                          ))
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma transferência registrada até o momento.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="members" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Access</CardTitle>
                    <CardDescription>
                      Manage who can access this project.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex flex-col space-y-1">
                        <Label htmlFor="team-restricted">Restrict to Teams</Label>
                        <span className="text-sm text-muted-foreground">
                          Only allow members of selected teams to access this project.
                        </span>
                      </div>
                      <Switch
                        id="team-restricted"
                        checked={project?.teamRestricted || false}
                        onCheckedChange={(checked) => {
                          if (!projectId) return;
                          updateProject({
                            id: projectId as Id<"projects">,
                            teamRestricted: checked,
                          });
                        }}
                      />
                    </div>

                    {(project?.teamRestricted || false) && (
                      <div className="space-y-4">
                        <Label>Allowed Teams</Label>
                        <div className="grid gap-4">
                          {teams?.map((team) => (
                            <div
                              key={team._id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`team-${team._id}`}
                                checked={project?.allowedTeamIds?.includes(
                                  team._id
                                )}
                                onCheckedChange={(checked) => {
                                  const currentTeams =
                                    project?.allowedTeamIds || [];
                                  const newTeams = checked
                                    ? [...currentTeams, team._id]
                                    : currentTeams.filter(
                                        (id) => id !== team._id
                                      );
                                  if (!projectId) return;
                                  updateProject({
                                    id: projectId as Id<"projects">,
                                    allowedTeamIds: newTeams,
                                  });
                                }}
                              />
                              <Label htmlFor={`team-${team._id}`}>
                                {team.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="p-6 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
              <p className="text-muted-foreground">
                Only project owners and managers can access these settings.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="w-full mx-auto px-6 py-8 max-w-[98%]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ProjectFilters
            filters={filters}
            setFilters={setFilters}
            members={activeAssignees}
            tags={allTags}
          />
          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
            <div className="mb-6">
              <TabsList className="grid w-full max-w-2xl grid-cols-5">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </TabsTrigger>
                <TabsTrigger value="kanban" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Timeline</span>
                </TabsTrigger>
                <TabsTrigger value="gantt" className="flex items-center gap-2">
                  <GanttChart className="h-4 w-4" />
                  <span className="hidden sm:inline">Gantt</span>
                </TabsTrigger>
                <TabsTrigger value="summary" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Resumo</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {!tasks ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : parentTasks.length === 0 ? (
              <Card className="shadow-md">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first task to get started
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <TabsContent value="list">{renderListView()}</TabsContent>
                <TabsContent value="kanban">{renderKanbanView()}</TabsContent>
                <TabsContent value="timeline">{renderTimelineView()}</TabsContent>
                <TabsContent value="gantt">{renderGanttView()}</TabsContent>
                <TabsContent value="summary">{renderSummaryView()}</TabsContent>
              </>
            )}
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}