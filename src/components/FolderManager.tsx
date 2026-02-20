import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Folder, FolderPlus, Edit, Trash2, Loader2, MoreHorizontal, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { FolderIcon } from "@/components/ui/folder-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FolderFormProps {
  workgroupId: Id<"workgroups">;
  folder?: {
    _id: Id<"folders">;
    name: string;
    description?: string;
    color?: string;
  };
  onSuccess?: () => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function FolderForm({ workgroupId, folder, onSuccess, externalOpen, onExternalOpenChange }: FolderFormProps) {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (onExternalOpenChange) onExternalOpenChange(val);
    else setInternalOpen(val);
  };

  const [name, setName] = useState(folder?.name || "");
  const [description, setDescription] = useState(folder?.description || "");
  const [color, setColor] = useState(folder?.color || "#6b7280");
  const [isLoading, setIsLoading] = useState(false);

  const createFolder = useMutation(api.folders.create);
  const updateFolder = useMutation(api.folders.update);

  // Reset form when opening for edit
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && folder) {
      setName(folder.name);
      setDescription(folder.description || "");
      setColor(folder.color || "#6b7280");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error(t("folders.nameRequired"));
      return;
    }

    setIsLoading(true);

    try {
      if (folder) {
        await updateFolder({
          id: folder._id,
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        });
        toast.success(t("folders.folderUpdated"));
      } else {
        await createFolder({
          workgroupId,
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        });
        toast.success(t("folders.folderCreated"));
      }

      setOpen(false);
      setName("");
      setDescription("");
      setColor("#6b7280");
      onSuccess?.();
    } catch (error) {
      console.error("Error saving folder:", error);
      toast.error(
        folder
          ? t("folders.errorUpdating")
          : t("folders.errorCreating")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Only show trigger button for creating new folder (not editing) */}
      {!folder && !externalOpen && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderPlus className="h-4 w-4 mr-2" />
            {t("folders.newFolder")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {folder
                ? t("folders.editFolder")
                : t("folders.createFolder")}
            </DialogTitle>
            <DialogDescription>
              {folder
                ? t("folders.editFolderDescription")
                : t("folders.createFolderDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                {t("folders.folderName")}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("folders.folderNamePlaceholder")}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                {t("folders.folderDescription")}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  t("folders.folderDescriptionPlaceholder")
                }
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color">{t("folders.folderColor")}</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
                <div className="flex items-center gap-2">
                  <FolderIcon color={color} size="sm" />
                  <span className="text-sm text-muted-foreground">{color}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {folder
                ? t("common.update")
                : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteFolderDialogProps {
  folder: {
    _id: Id<"folders">;
    name: string;
  };
  onSuccess?: () => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function DeleteFolderDialog({ folder, onSuccess, externalOpen, onExternalOpenChange }: DeleteFolderDialogProps) {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (onExternalOpenChange) onExternalOpenChange(val);
    else setInternalOpen(val);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"keep" | "delete">("keep");
  const deleteFolder = useMutation(api.folders.remove);
  const projectCount = useQuery(api.folders.countProjects, { folderId: folder._id });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setDeleteMode("keep");
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      await deleteFolder({ id: folder._id, deleteProjects: deleteMode === "delete" });
      toast.success(t("folders.folderDeleted"));
      setOpen(false);
      setDeleteMode("keep");
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error(t("folders.errorDeleting"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("folders.deleteFolder")}</DialogTitle>
          <DialogDescription>
            {t("folders.deleteFolderConfirm")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm">
            <strong>{t("folders.folderName")}:</strong> {folder.name}
          </p>

          {(projectCount ?? 0) > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t("folders.folderHasProjects").replace("{count}", String(projectCount))}
                </span>
              </div>
              <RadioGroup value={deleteMode} onValueChange={(v) => setDeleteMode(v as "keep" | "delete")} className="space-y-2">
                <div className="flex items-start space-x-3 rounded-md border p-3">
                  <RadioGroupItem value="keep" id="keep-projects" className="mt-0.5" />
                  <Label htmlFor="keep-projects" className="cursor-pointer space-y-1">
                    <span className="font-medium">{t("folders.keepProjects")}</span>
                    <p className="text-xs text-muted-foreground">{t("folders.keepProjectsDescription")}</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 rounded-md border border-destructive/50 p-3">
                  <RadioGroupItem value="delete" id="delete-projects" className="mt-0.5" />
                  <Label htmlFor="delete-projects" className="cursor-pointer space-y-1">
                    <span className="font-medium text-destructive">{t("folders.deleteProjectsToo")}</span>
                    <p className="text-xs text-muted-foreground">{t("folders.deleteProjectsDescription")}</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deleteMode === "delete" ? t("folders.deleteAll") : t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dropdown menu combining rename and delete actions for a folder
interface FolderActionsProps {
  workgroupId: Id<"workgroups">;
  folder: {
    _id: Id<"folders">;
    name: string;
    description?: string;
    color?: string;
  };
  onSuccess?: () => void;
}

export function FolderActions({ workgroupId, folder, onSuccess }: FolderActionsProps) {
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            {t("folders.editFolder")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("folders.deleteFolder")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FolderForm
        workgroupId={workgroupId}
        folder={folder}
        onSuccess={onSuccess}
        externalOpen={editOpen}
        onExternalOpenChange={setEditOpen}
      />

      <DeleteFolderDialog
        folder={folder}
        onSuccess={onSuccess}
        externalOpen={deleteOpen}
        onExternalOpenChange={setDeleteOpen}
      />
    </>
  );
}
