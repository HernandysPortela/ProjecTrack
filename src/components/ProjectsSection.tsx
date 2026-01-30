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
import { TrendingUpIcon, Check, X, Edit2, ExternalLink, Download, Search, Filter } from "lucide-react";
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{t("projects.title")}</CardTitle>
          </div>
          <Button
            onClick={handleExportToExcel}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t("projects.exportToExcel")}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("projects.searchByName")}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("projects.searchByOwner")}
                value={searchOwner}
                onChange={(e) => setSearchOwner(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="pl-9">
                  <SelectValue placeholder={t("projects.filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("projects.allStatuses")}</SelectItem>
                  <SelectItem value="in_progress">{t("projects.inProgress")}</SelectItem>
                  <SelectItem value="paused">{t("projects.paused")}</SelectItem>
                  <SelectItem value="finished">{t("projects.finished")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results counter and clear button */}
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredAndSortedProjects && filteredAndSortedProjects.length > 0 && (
                <span>
                  {filteredAndSortedProjects.length} {filteredAndSortedProjects.length === 1 ? t("projects.project") : t("projects.projects")}
                  {(searchName || searchOwner || filterStatus !== "all") && ` ${t("projects.found")}`}
                </span>
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
              >
                <X className="h-4 w-4 mr-1" />
                {t("projects.clearFilters")}
              </Button>
            )}
          </div>

          {!filteredAndSortedProjects || filteredAndSortedProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {projects && projects.length > 0 ? t("projects.noMatchingProjects") : t("projects.noProjects")}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>{t("projects.projectName")}</TableHead>
                    <TableHead>{t("projects.description")}</TableHead>
                    <TableHead className="text-center">{t("projects.priority")}</TableHead>
                    <TableHead>{t("projects.startQuarter")}</TableHead>
                    <TableHead>{t("projects.startDate")}</TableHead>
                    <TableHead>{t("projects.endDate")}</TableHead>
                    <TableHead>{t("projects.owner")}</TableHead>
                    <TableHead className="text-center">{t("projects.approval")}</TableHead>
                    <TableHead className="text-center">{t("projects.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProjects.map((project: any) => {
                    const ownerName = getOwnerName(project.ownerId);
                    const isEditing = editingPriority === project._id;

                    return (
                      <TableRow key={project._id} className="hover:bg-muted/50">
                        <TableCell>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{project.name}</TableCell>
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
                                <Badge variant="secondary" className="text-xs">
                                  <TrendingUpIcon className="w-3 h-3 mr-1" />
                                  {project.priority}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
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
                                className="h-8 px-2"
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
                                    ? "bg-green-600 hover:bg-green-700 text-white" :
                                  project.approvalStatus === "blocked"
                                    ? "bg-red-600 hover:bg-red-700 text-white" :
                                  "bg-blue-600 hover:bg-blue-700 text-white"
                                }
                              >
                                {project.approvalStatus === "approved" ? t("projects.approvalApproved") :
                                 project.approvalStatus === "blocked" ? t("projects.approvalBlocked") :
                                 t("projects.approvalPending")}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
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
                              className="h-8"
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
