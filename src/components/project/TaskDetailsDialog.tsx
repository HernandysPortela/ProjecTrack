import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { TaskDependencyManager } from "@/components/TaskDependencyManager";

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  projectId: Id<"projects">;
  members: any[];
  tags: any[];
  taskTags: any[];
  onUpdateTask: (updates: any) => void;
  onAddTag: (tagId: Id<"tags">) => void;
  onRemoveTag: (taskTagId: Id<"task_tags">) => void;
  onAddComment: () => void;
  newComment: string;
  setNewComment: (comment: string) => void;
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  projectId,
  members,
  tags,
  taskTags,
  onUpdateTask,
  onAddTag,
  onRemoveTag,
  onAddComment,
  newComment,
  setNewComment,
}: TaskDetailsDialogProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={task.title}
                onChange={(e) => onUpdateTask({ title: e.target.value })}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={task.description || ""}
                onChange={(e) => onUpdateTask({ description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={task.status}
                  onValueChange={(value) => onUpdateTask({ status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">A Fazer</SelectItem>
                    <SelectItem value="In Progress">Em Progresso</SelectItem>
                    <SelectItem value="Review">Revisão</SelectItem>
                    <SelectItem value="Done">Concluído</SelectItem>
                    <SelectItem value="Blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select
                  value={task.priority}
                  onValueChange={(value) => onUpdateTask({ priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsável</Label>
                <Select
                  value={task.assigneeId || "unassigned"}
                  onValueChange={(value) =>
                    onUpdateTask({ assigneeId: value === "unassigned" ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={task.dueDate || ""}
                  onChange={(e) => onUpdateTask({ dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Custo Estimado</Label>
                <Input
                  type="number"
                  value={task.estimatedCost || ""}
                  onChange={(e) =>
                    onUpdateTask({ estimatedCost: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Progresso (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={task.progress || 0}
                  onChange={(e) =>
                    onUpdateTask({ progress: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="mb-2 block">Tags</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {taskTags.map((taskTag) => (
                <Badge key={taskTag._id} variant="secondary" className="gap-1">
                  {taskTag.tagName}
                  <button
                    onClick={() => onRemoveTag(taskTag._id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Select onValueChange={(value) => onAddTag(value as Id<"tags">)}>
              <SelectTrigger>
                <SelectValue placeholder="Adicionar tag..." />
              </SelectTrigger>
              <SelectContent>
                {tags
                  .filter((tag) => !taskTags.some((tt) => tt.tagId === tag._id))
                  .map((tag) => (
                    <SelectItem key={tag._id} value={tag._id}>
                      {tag.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <Label className="mb-2 block">Dependências</Label>
            <TaskDependencyManager taskId={task._id} projectId={projectId} />
          </div>

          <Separator />

          <div>
            <Label className="mb-2 block">Comentários</Label>
            <div className="space-y-3 mb-4">
              {task.comments?.map((comment: any, index: number) => (
                <div key={index} className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {comment.authorName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{comment.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{comment.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário..."
                rows={2}
              />
              <Button onClick={onAddComment} disabled={!newComment.trim()}>
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}