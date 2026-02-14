import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TrendingUpIcon, Check, X, Edit2, ExternalLink, Download, Search, Filter, FolderKanban } from "lucide-react";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProjectsSection() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const user = useQuery((api as any).users.currentUser);
  const projects = useQuery((api as any).projects.listByUser);
  const updatePriority = useMutation((api as any).projects.updatePriority);
  const updateProject = useMutation((api as any).projects.updateProject);

  const [editingPriority, setEditingPriority] = useState<Id<"projects"> | null>(null);
  const [priorityValue, setPriorityValue] = useState<number>(1);
  const [editingDescription, setEditingDescription] = useState<Id<"projects"> | null>(null);
  const [descriptionValue, setDescriptionValue] = useState<string>("");
  const [editingQuarter, setEditingQuarter] = useState<Id<"projects"> | null>(null);
  const [quarterValue, setQuarterValue] = useState<string>("");
  const [editingApproval, setEditingApproval] = useState<Id<"projects"> | null>(null);
  const [approvalValue, setApprovalValue] = useState<string>("pending");

  // Filter states
  const [searchName, setSearchName] = useState<string>("");
  const [searchOwner, setSearchOwner] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  if (!user) {
    return null;
  }

  // Get project owner name
  const getOwnerName = (ownerId: Id<"users"> | undefined) => {
    if (!ownerId) return t("projects.noOwner");
    // Since we don't have access to all users here, we'll show if it's current user
    return ownerId === user._id ? user.name : t("projects.otherOwner");
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

  const handleSaveDescription = async (projectId: Id<"projects">) => {
    try {
      await updateProject({
        id: projectId,
        description: descriptionValue,
      });
      toast.success(t("projects.descriptionUpdated"));
      setEditingDescription(null);
    } catch (error) {
      toast.error(t("projects.descriptionUpdateFailed"));
      console.error(error);
    }
  };

  const handleSaveQuarter = async (projectId: Id<"projects">) => {
    try {
      await updateProject({
        id: projectId,
        startQuarter: quarterValue,
      });
      toast.success(t("projects.quarterUpdated"));
      setEditingQuarter(null);
    } catch (error) {
      toast.error(t("projects.quarterUpdateFailed"));
      console.error(error);
    }
  };

  const handleSaveApproval = async (projectId: Id<"projects">) => {
    try {
      await updateProject({
        id: projectId,
        approvalStatus: approvalValue as "pending" | "approved" | "blocked",
      });
      toast.success(t("projects.approvalUpdated"));
      setEditingApproval(null);
    } catch (error) {
      toast.error(t("projects.approvalUpdateFailed"));
      console.error(error);
    }
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return t("projects.noDate");
    return new Date(timestamp).toLocaleDateString();
  };

  // Filter and sort projects
  const filteredAndSortedProjects = projects
    ? [...projects]
        .filter((project) => {
          // Filter by name
          const matchesName = searchName
            ? project.name.toLowerCase().includes(searchName.toLowerCase())
            : true;

          // Filter by owner
          const ownerName = getOwnerName(project.ownerId);
          const matchesOwner = searchOwner
            ? ownerName.toLowerCase().includes(searchOwner.toLowerCase())
            : true;

          // Filter by status
          const matchesStatus = filterStatus === "all" || project.status === filterStatus;

          return matchesName && matchesOwner && matchesStatus;
        })
        .sort((a, b) => {
          const aPriority = a.priority ?? 999;
          const bPriority = b.priority ?? 999;
          return aPriority - bPriority;
        })
    : [];

  const handleExportToExcel = () => {
    if (!filteredAndSortedProjects || filteredAndSortedProjects.length === 0) {
      toast.error(t("projects.noDataToExport"));
      return;
    }

    // Prepare data for Excel
    const excelData = filteredAndSortedProjects.map((project) => ({
      [t("projects.projectName")]: project.name,
      [t("projects.description")]: project.description || t("projects.noDescription"),
      [t("projects.priority")]: project.priority ?? "-",
      [t("projects.startQuarter")]: project.startQuarter || "-",
      [t("projects.startDate")]: formatDate(project.startDate),
      [t("projects.endDate")]: formatDate(project.endDate),
      [t("projects.owner")]: getOwnerName(project.ownerId),
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("projects.title"));

    // Set column widths
    const colWidths = [
      { wch: 25 }, // Project Name
      { wch: 40 }, // Description
      { wch: 10 }, // Priority
      { wch: 20 }, // Start Quarter
      { wch: 15 }, // Start Date
      { wch: 15 }, // End Date
      { wch: 20 }, // Owner
    ];
    ws["!cols"] = colWidths;

    // Generate file name with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const fileName = `${t("projects.title")}_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, fileName);
    toast.success(t("projects.exportSuccess"));
  };

  return (
    <div className="container mx-auto p-6 max-w-full">
      {/* Cabeçalho moderno */}
      <div className="mb-8 bg-gradient-to-br from-background via-background to-primary/5 rounded-xl p-6 border border-border/50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {t("projects.title")}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Gerencie e acompanhe todos os seus projetos</p>
            </div>
          </div>
          <Button
            onClick={handleExportToExcel}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            {t("projects.exportToExcel")}
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden rounded-xl">
        <CardHeader className="pb-6 bg-gradient-to-r from-background to-muted/20 border-b">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
              Filtros e Busca
            </CardTitle>
            <p className="text-sm text-muted-foreground">Encontre rapidamente o projeto que precisa</p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Nome do Projeto
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("projects.searchByName")}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-9 hover:bg-muted/50 transition-all border-border/60 hover:border-primary/40 h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Proprietário
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("projects.searchByOwner")}
                  value={searchOwner}
                  onChange={(e) => setSearchOwner(e.target.value)}
                  className="pl-9 hover:bg-muted/50 transition-all border-border/60 hover:border-primary/40 h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Status
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="pl-9 hover:bg-muted/50 transition-all border-border/60 hover:border-primary/40 h-10">
                    <SelectValue placeholder={t("projects.filterByStatus")} />
                  </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        {t("projects.allStatuses")}
                      </div>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        {t("projects.inProgress")}
                      </div>
                    </SelectItem>
                    <SelectItem value="paused">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        {t("projects.paused")}
                      </div>
                    </SelectItem>
                    <SelectItem value="finished">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        {t("projects.finished")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Results counter and clear button */}
          <div className="mb-6 flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
            <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
              {filteredAndSortedProjects && filteredAndSortedProjects.length > 0 && (
                <>
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span>
                    {filteredAndSortedProjects.length} {filteredAndSortedProjects.length === 1 ? t("projects.project") : t("projects.projects")}
                    {(searchName || searchOwner || filterStatus !== "all") && ` ${t("projects.found")}`}
                  </span>
                </>
              )}
            </div>
            {(searchName || searchOwner || filterStatus !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchName("");
                  setSearchOwner("");
                  setFilterStatus("all");
                }}
                className="hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4 mr-1" />
                {t("projects.clearFilters")}
              </Button>
            )}
          </div>

          {!filteredAndSortedProjects || filteredAndSortedProjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-4 bg-muted/30 rounded-full mb-4">
                <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-foreground/70 mb-1">
                {projects && projects.length > 0 ? t("projects.noMatchingProjects") : t("projects.noProjects")}
              </p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou criar um novo projeto</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="w-[40px] font-semibold text-foreground/90"></TableHead>
                    <TableHead className="font-semibold text-foreground/90">{t("projects.projectName")}</TableHead>
                    <TableHead className="font-semibold text-foreground/90">{t("projects.description")}</TableHead>
                    <TableHead className="text-center font-semibold text-foreground/90">{t("projects.priority")}</TableHead>
                    <TableHead className="font-semibold text-foreground/90">{t("projects.startQuarter")}</TableHead>
                    <TableHead className="font-semibold text-foreground/90">{t("projects.startDate")}</TableHead>
                    <TableHead className="font-semibold text-foreground/90">{t("projects.endDate")}</TableHead>
                    <TableHead className="font-semibold text-foreground/90">{t("projects.owner")}</TableHead>
                    <TableHead className="text-center font-semibold text-foreground/90">{t("projects.approval")}</TableHead>
                    <TableHead className="text-center font-semibold text-foreground/90">{t("projects.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProjects.map((project: any) => {
                    const ownerName = getOwnerName(project.ownerId);
                    const isEditing = editingPriority === project._id;

                    return (
                      <TableRow key={project._id} className="hover:bg-gradient-to-r hover:from-muted/30 hover:to-primary/5 transition-all duration-200 border-b border-border/30 group">
                        <TableCell>
                          <div
                            className="w-5 h-5 rounded-full shadow-md ring-2 ring-background group-hover:scale-110 transition-transform duration-200"
                            style={{ backgroundColor: project.color }}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors">{project.name}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate flex-1">
                              {project.description || t("projects.noDescription")}
                            </span>
                            <Dialog
                              open={editingDescription === project._id}
                              onOpenChange={(open) => {
                                if (!open) setEditingDescription(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDescription(project._id);
                                    setDescriptionValue(project.description || "");
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent onClick={(e) => e.stopPropagation()}>
                                <DialogHeader>
                                  <DialogTitle>{t("projects.editDescription")}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <Textarea
                                    value={descriptionValue}
                                    onChange={(e) => setDescriptionValue(e.target.value)}
                                    placeholder={t("projects.descriptionPlaceholder")}
                                    rows={5}
                                    className="resize-none"
                                  />
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setEditingDescription(null)}
                                  >
                                    {t("projects.cancel")}
                                  </Button>
                                  <Button onClick={() => handleSaveDescription(project._id)}>
                                    {t("projects.save")}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Input
                                type="number"
                                min="1"
                                value={priorityValue}
                                onChange={(e) => setPriorityValue(parseInt(e.target.value) || 1)}
                                className="w-16 h-8 text-center"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
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
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPriority(null);
                                }}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              {project.priority ? (
                                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md hover:shadow-lg transition-all">
                                  <TrendingUpIcon className="w-3 h-3 mr-1" />
                                  {project.priority}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPriority(project._id);
                                  setPriorityValue(project.priority ?? 1);
                                }}
                              >
                                {t("projects.edit")}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingQuarter === project._id ? (
                            <div className="flex items-center justify-center gap-1">
                              <select
                                value={quarterValue}
                                onChange={(e) => setQuarterValue(e.target.value)}
                                className="w-24 h-8 text-sm rounded border"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">-</option>
                                <option value="1T">1º Trimestre</option>
                                <option value="2T">2º Trimestre</option>
                                <option value="3T">3º Trimestre</option>
                                <option value="4T">4º Trimestre</option>
                              </select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveQuarter(project._id);
                                }}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingQuarter(null);
                                }}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <span>{project.startQuarter || "-"}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingQuarter(project._id);
                                  setQuarterValue(project.startQuarter || "");
                                }}
                              >
                                {t("projects.edit")}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(project.startDate)}</TableCell>
                        <TableCell>{formatDate(project.endDate)}</TableCell>
                        <TableCell>{ownerName}</TableCell>
                        <TableCell className="text-center">
                          {editingApproval === project._id ? (
                            <div className="flex items-center justify-center gap-1">
                              <Select value={approvalValue} onValueChange={setApprovalValue}>
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">{t("projects.approvalPending")}</SelectItem>
                                  <SelectItem value="approved">{t("projects.approvalApproved")}</SelectItem>
                                  <SelectItem value="blocked">{t("projects.approvalBlocked")}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveApproval(project._id);
                                }}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingApproval(null);
                                }}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Badge
                                className={
                                  project.approvalStatus === "approved"
                                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md hover:shadow-lg transition-all border-0" :
                                  project.approvalStatus === "blocked"
                                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:shadow-lg transition-all border-0" :
                                  "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg transition-all border-0"
                                }
                              >
                                {project.approvalStatus === "approved" ? t("projects.approvalApproved") :
                                 project.approvalStatus === "blocked" ? t("projects.approvalBlocked") :
                                 t("projects.approvalPending")}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingApproval(project._id);
                                  setApprovalValue(project.approvalStatus || "pending");
                                }}
                              >
                                {t("projects.edit")}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/project/${project._id}`);
                              }}
                              title={t("projects.openProject")}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {t("projects.open")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
