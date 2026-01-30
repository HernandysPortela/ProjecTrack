import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNavigate, useParams } from "react-router";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, FolderKanban, Plus, Download, TrendingUp, Edit2, Check, X, Search } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Id } from "@convex/_generated/dataModel";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";

interface WorkgroupViewProps {
  workgroupId?: string;
}

export default function WorkgroupView({ workgroupId: propWorkgroupId }: WorkgroupViewProps = {}) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const params = useParams();
  const workgroupId = propWorkgroupId || params.workgroupId;

  const workgroup = useQuery(
    api.workgroups.get,
    workgroupId ? { id: workgroupId as Id<"workgroups"> } : "skip"
  );

  const projects = useQuery(
    api.projects.list,
    workgroupId ? { workgroupId: workgroupId as Id<"workgroups"> } : "skip"
  );

  const exportData = useQuery(
    api.exports.getWorkgroupExportData,
    workgroupId ? { workgroupId: workgroupId as Id<"workgroups"> } : "skip"
  );

  const createProject = useMutation(api.projects.create);
  const updateProjectStatus = useMutation(api.projects.updateStatus);
  const updatePriority = useMutation(api.projects.updatePriority);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectColor, setProjectColor] = useState("#3b82f6");
  const [isCreating, setIsCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("in_progress,paused");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingPriority, setEditingPriority] = useState<Id<"projects"> | null>(null);
  const [priorityValue, setPriorityValue] = useState<number>(1);

  const downloadProjectsAsExcel = useCallback(() => {
    if (!exportData || exportData.length === 0) {
      toast.error("Nenhum projeto disponível para exportar.");
      return;
    }

    try {
      console.log("Export Data:", exportData);

      const sanitize = (text: string | undefined) => {
        if (!text) return "";
        return text.replace(/[<>&"']/g, (char) => {
          const entities: Record<string, string> = {
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            '"': "&quot;",
            "'": "&#39;",
          };
          return entities[char] || char;
        });
      };

      const formatCurrency = (value: number | undefined) => {
        if (!value) return "R$ 0,00";
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      };

      const formatDate = (timestamp: number | undefined) => {
        if (!timestamp) return "-";
        return new Date(timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      };

      const workgroupName = workgroup?.name || "Workgroup";
      const workgroupDescription = workgroup?.description || "";

      const grandTotalCost = exportData.reduce((sum: number, project: any) => sum + (project.totalCost || 0), 0);

      const projectRows = exportData
        .map(
          (project: any) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${sanitize(project.name)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${sanitize(project.description || "")}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${project.taskCount || 0}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${sanitize(project.status || "in_progress")}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(project.totalCost)}</td>
        </tr>
      `
        )
        .join("");

      // Helper to normalize IDs for comparison
      const normalizeId = (id: any): string => {
        if (!id) return "";
        if (typeof id === "string") return id;
        if (typeof id === "object" && id !== null) {
          return id.id || id.toString() || JSON.stringify(id);
        }
        return String(id);
      };

      // Helper to find parent task title
      const getParentTaskTitle = (task: any, allTasks: any[]): string => {
        if (!task.parentTaskId) return "-";
        const parentId = normalizeId(task.parentTaskId);
        const parent = allTasks.find(t => normalizeId(t._id) === parentId);
        return parent ? parent.title : "-";
      };

      const projectTaskSections = exportData
        .map((project: any) => {
          if (!project.tasks || project.tasks.length === 0) return "";

          // Sort tasks: first by parentTaskId (nulls first), then by startDate
          const sortedTasks = [...project.tasks].sort((a, b) => {
            // Group by parent: tasks without parent first, then by parent ID
            const aParent = normalizeId(a.parentTaskId) || "0";
            const bParent = normalizeId(b.parentTaskId) || "0";

            if (aParent !== bParent) {
              return aParent.localeCompare(bParent);
            }

            // Within same parent group, sort by start date
            const aDate = a.startDate || 0;
            const bDate = b.startDate || 0;
            return aDate - bDate;
          });

          const taskRows = sortedTasks
            .map((task: any) => {
              const parentTitle = getParentTaskTitle(task, project.tasks);
              return `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${sanitize(task.title)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${sanitize(parentTitle)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${sanitize(task.assigneeName)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${sanitize(task.status)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(task.startDate)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(task.dueDate)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(task.estimatedCost)}</td>
                </tr>
              `;
            })
            .join("");

          return `
            <div class="section-title">${sanitize(project.name)} - Tarefas Detalhadas</div>
            <table>
              <thead>
                <tr>
                  <th>Tarefa</th>
                  <th>Subtarefa de</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th>Data de Início</th>
                  <th>Data Prevista</th>
                  <th>Custo Estimado</th>
                </tr>
              </thead>
              <tbody>
                ${taskRows}
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                  <td colspan="6" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total do Projeto:</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(project.totalCost)}</td>
                </tr>
              </tbody>
            </table>
          `;
        })
        .join("");

      const worksheet = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th { background-color: #4CAF50; color: white; font-weight: bold; border: 1px solid #ddd; padding: 8px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            .header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .description { font-size: 12px; color: #666; margin-bottom: 20px; }
            .section-title { font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; background-color: #e8f5e9; padding: 8px; }
            .grand-total { font-size: 16px; font-weight: bold; margin-top: 20px; padding: 10px; background-color: #c8e6c9; }
          </style>
        </head>
        <body>
          <div class="header">${sanitize(workgroupName)} - Relatório Completo de Projetos</div>
          ${workgroupDescription ? `<div class="description">${sanitize(workgroupDescription)}</div>` : ""}
          
          <div class="section-title">Resumo dos Projetos</div>
          <table>
            <thead>
              <tr>
                <th>Nome do Projeto</th>
                <th>Descrição</th>
                <th>Número de Tarefas</th>
                <th>Status</th>
                <th>Custo Total</th>
              </tr>
            </thead>
            <tbody>
              ${projectRows}
            </tbody>
          </table>

          <div class="grand-total">Custo Total de Todos os Projetos: ${formatCurrency(grandTotalCost)}</div>

          ${projectTaskSections}
        </body>
        </html>
      `;

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + worksheet], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });

      const dataUrl = URL.createObjectURL(blob);
      const fileName = `${workgroupName.replace(/[^a-z0-9]/gi, "_")}_relatorio_completo.xls`;

      toast.success("Exportando relatório completo para Excel...");

      window.open(dataUrl, "_blank");

      setTimeout(() => URL.revokeObjectURL(dataUrl), 10000);
    } catch (error) {
      console.error("Erro ao exportar projetos:", error);
      toast.error("Erro ao exportar projetos para Excel.");
    }
  }, [workgroup, exportData]);

  const filteredProjects = (projects?.filter((project: any) => {
    // Filter by status (can be multiple statuses separated by comma)
    const statusMatch = statusFilter === "all"
      ? true
      : statusFilter.split(',').includes(project.status);

    // Filter by search query (name or description)
    const searchMatch = searchQuery.trim() === ""
      ? true
      : project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return statusMatch && searchMatch;
  }) || []).sort((a: any, b: any) => {
    const aPriority = a.priority ?? 999;
    const bPriority = b.priority ?? 999;
    return aPriority - bPriority;
  });

  const handleStatusChange = async (projectId: Id<"projects">, newStatus: string) => {
    try {
      await updateProjectStatus({ projectId, status: newStatus });
      toast.success("Status atualizado com sucesso");
    } catch (error) {
      toast.error("Erro ao atualizar status");
      console.error(error);
    }
  };

  const handleSavePriority = async (projectId: Id<"projects">) => {
    try {
      await updatePriority({
        id: projectId,
        priority: priorityValue,
      });
      toast.success(t("projects.priorityUpdated"));
      setEditingPriority(null);
    } catch (error) {
      toast.error(t("projects.priorityUpdateFailed"));
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workgroup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !workgroupId) return;

    setIsCreating(true);
    try {
      await createProject({
        workgroupId: workgroupId as Id<"workgroups">,
        name: projectName,
        description: projectDescription || undefined,
        color: projectColor,
      });
      toast.success("Project created successfully");
      setIsCreateDialogOpen(false);
      setProjectName("");
      setProjectDescription("");
      setProjectColor("#3b82f6");
    } catch (error) {
      toast.error("Failed to create project");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const canCreateProject = workgroup?.role === "owner" || workgroup?.role === "manager";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="flex h-16 items-center gap-4 px-6 max-w-[98%] mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ProjecTrak" className="h-8 w-8" />
            <h1 className="text-xl font-bold tracking-tight">{workgroup.name}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full mx-auto px-6 py-8 max-w-[98%]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-8">
            <div className="mb-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('projects.title')}</h2>
                {workgroup.description && (
                  <p className="text-muted-foreground mt-1">{workgroup.description}</p>
                )}
              </div>
            </div>

            {/* Search and Filter Row */}
            {projects && projects.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou descrição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="status-filter" className="text-sm font-medium whitespace-nowrap">
                    Filtrar por status:
                  </Label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">Todos</option>
                    <option value="in_progress,paused">Em Andamento e Pausado</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="paused">Pausado</option>
                    <option value="finished">Finalizado</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  onClick={downloadProjectsAsExcel}
                  className="mr-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar em Excel
                </Button>
                {canCreateProject && (
                  <Button className="shadow-md" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common.newProject')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {canCreateProject && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('common.createProject')}</DialogTitle>
                  <DialogDescription>
                    {t('projects.createProjectDescription')}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t('projects.name')}</Label>
                    <Input
                      id="name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder={t('projects.namePlaceholder')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{t('projects.description')}</Label>
                    <Textarea
                      id="description"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder={t('projects.projectDescriptionPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">{t('projects.color')}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={projectColor}
                        onChange={(e) => setProjectColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <span className="text-sm text-muted-foreground">{projectColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      {t('projects.cancel')}
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t('common.create')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {!projects ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('projects.noProjectsYet')}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {t('projects.createFirstProject')}
                </p>
                {canCreateProject && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common.createProject')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProjects.map((project: any, index: number) => {
                const isEditingThisPriority = editingPriority === project._id;

                return (
                  <motion.div
                    key={project._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card
                      className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/project/${project._id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                          </div>
                          <select
                            value={project.status || "in_progress"}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(project._id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-7 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="in_progress">Em Andamento</option>
                            <option value="paused">Pausado</option>
                            <option value="finished">Finalizado</option>
                          </select>
                        </div>
                        {project.description && (
                          <CardDescription className="line-clamp-2">
                            {project.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            {project.taskCount} tasks
                          </div>

                          {/* Priority section */}
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {isEditingThisPriority ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={priorityValue}
                                  onChange={(e) => setPriorityValue(parseInt(e.target.value) || 1)}
                                  className="w-16 h-7 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSavePriority(project._id);
                                  }}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPriority(null);
                                  }}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                {project.priority && (
                                  <Badge variant="secondary" className="text-xs">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    {project.priority}
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPriority(project._id);
                                    setPriorityValue(project.priority ?? 1);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}