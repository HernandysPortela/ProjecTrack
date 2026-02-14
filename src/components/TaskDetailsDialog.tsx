import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router";
import {
  Calendar,
  User,
  AlertCircle,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  MessageSquare,
  Paperclip,
  Tag,
  ArrowRight,
} from "lucide-react";

interface TaskDetailsDialogProps {
  task: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsDialog({ task, open, onOpenChange }: TaskDetailsDialogProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const taskChecklistItems = useQuery(
    api.checklists.list,
    task ? { taskId: task._id } : "skip"
  );

  const taskTagsList = useQuery(
    api.tags.getTaskTags,
    task ? { taskId: task._id } : "skip"
  );

  const taskComments = useQuery(
    api.comments.list,
    task ? { taskId: task._id } : "skip"
  );

  const taskAttachments = useQuery(
    api.attachments.list,
    task ? { taskId: task._id } : "skip"
  );

  if (!task) return null;

  const isOverdue = task.dueDate &&
    task.status !== 'done' &&
    new Date(task.dueDate) < new Date();

  const dueDateFormatted = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('pt-BR')
    : t('dashboard.noDueDate');

  const startDateFormatted = task.startDate
    ? new Date(task.startDate).toLocaleDateString('pt-BR')
    : '-';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-600 text-white";
      case "high":
        return "bg-red-600 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    if (isOverdue) return "bg-red-100 text-red-700 border-red-300";
    switch (status) {
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "todo":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "review":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "done":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusLabel = (status: string) => {
    if (isOverdue) return t('tasks.overdue');
    switch (status) {
      case "in_progress":
        return t('tasks.inProgress');
      case "todo":
        return t('tasks.toDo');
      case "review":
        return t('tasks.review');
      case "done":
        return t('tasks.done');
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "urgent":
        return t('tasks.urgent');
      case "high":
        return t('tasks.high');
      case "medium":
        return t('tasks.medium');
      case "low":
        return t('tasks.low');
      default:
        return priority;
    }
  };

  const handleOpenInProject = () => {
    navigate(`/project/${task.projectId}?taskId=${task._id}`);
    onOpenChange(false);
  };

  const completedChecklistItems = taskChecklistItems?.filter(item => item.completed).length || 0;
  const totalChecklistItems = taskChecklistItems?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl mb-2">{task.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {task.projectName}
                </span>
                <span>•</span>
                <span>{task.workgroupName}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInProject}
              className="flex items-center gap-2 shrink-0"
            >
              <span>Editar</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <Badge className={`${getStatusColor(task.status)} border flex items-center gap-1 w-fit`}>
              {isOverdue && <AlertCircle className="h-3 w-3" />}
              {getStatusLabel(task.status)}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Prioridade</div>
            <Badge className={`${getPriorityColor(task.priority)} w-fit`}>
              {getPriorityLabel(task.priority)}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Responsável
            </div>
            <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-950 px-3 py-1.5 rounded-md w-fit">
              <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="font-bold italic text-blue-800 dark:text-blue-200 text-sm">
                {task.assigneeName || t('common.none')}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Vencimento
            </div>
            <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-700 dark:text-red-400 font-semibold' : ''}`}>
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{dueDateFormatted}</span>
            </div>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1 -mx-6 px-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="checklist">
                Checklist
                {totalChecklistItems > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {completedChecklistItems}/{totalChecklistItems}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tags">
                Tags
                {taskTagsList && taskTagsList.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {taskTagsList.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments">
                Comentários
                {taskComments && taskComments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {taskComments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments">
                Anexos
                {taskAttachments && taskAttachments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {taskAttachments.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Descrição</h3>
                {task.description ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem descrição</p>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Data de Início</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{startDateFormatted}</span>
                  </div>
                </div>

                {task.estimatedCost && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Custo Estimado</h3>
                    <p className="text-sm">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(Number(task.estimatedCost))}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="space-y-3 mt-4">
              {taskChecklistItems && taskChecklistItems.length > 0 ? (
                <div className="space-y-2">
                  {taskChecklistItems.map((item: any) => (
                    <div
                      key={item._id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <CheckSquare
                        className={`h-5 w-5 mt-0.5 ${item.completed ? 'text-green-600' : 'text-muted-foreground'}`}
                      />
                      <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum item de checklist</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tags" className="space-y-3 mt-4">
              {taskTagsList && taskTagsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {taskTagsList.map((tag: any) => (
                    <Badge
                      key={tag._id}
                      variant="outline"
                      className="flex items-center gap-2"
                      style={{ borderColor: tag.color }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma tag</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-3 mt-4">
              {taskComments && taskComments.length > 0 ? (
                <div className="space-y-3">
                  {taskComments.map((comment: any) => (
                    <div key={comment._id} className="flex gap-3 p-4 rounded-lg border bg-card">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {comment.userName?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{comment.userName || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment._creationTime).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum comentário</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="space-y-3 mt-4">
              {taskAttachments && taskAttachments.length > 0 ? (
                <div className="space-y-2">
                  {taskAttachments.map((attachment: any) => (
                    <div
                      key={attachment._id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(attachment._creationTime).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      {attachment.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum anexo</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <Separator />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleOpenInProject}>
            Abrir no Projeto
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
