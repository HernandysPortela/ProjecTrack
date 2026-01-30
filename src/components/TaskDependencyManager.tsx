import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link2, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TaskDependencyManagerProps {
  taskId: Id<"tasks">;
  projectId: Id<"projects">;
}

export function TaskDependencyManager({ taskId, projectId }: TaskDependencyManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<string>("finish_to_start");

  const dependencies = useQuery(api.taskDependencies.getTaskDependencies, { taskId });
  const dependents = useQuery(api.taskDependencies.getTaskDependents, { taskId });
  const projectTasks = useQuery(api.tasks.list, { projectId });
  const canStart = useQuery(api.taskDependencies.canStartTask, { taskId });

  const addDependency = useMutation(api.taskDependencies.addDependency);
  const removeDependency = useMutation(api.taskDependencies.removeDependency);

  const handleAddDependency = async () => {
    if (!selectedTaskId) {
      toast.error("Selecione uma tarefa");
      return;
    }

    try {
      await addDependency({
        taskId,
        dependsOnTaskId: selectedTaskId as Id<"tasks">,
        dependencyType: dependencyType as any,
      });
      toast.success("Dependência adicionada com sucesso");
      setSelectedTaskId("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar dependência");
    }
  };

  const handleRemoveDependency = async (dependencyId: Id<"taskDependencies">) => {
    try {
      await removeDependency({ dependencyId });
      toast.success("Dependência removida com sucesso");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover dependência");
    }
  };

  const availableTasks = projectTasks?.filter((t: any) => t._id !== taskId) || [];

  const getDependencyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      finish_to_start: "Término → Início",
      start_to_start: "Início → Início",
      finish_to_finish: "Término → Término",
      start_to_finish: "Início → Término",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Dependency Status Alert */}
      {canStart && !canStart.canStart && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold">Tarefa bloqueada por dependências:</div>
            <ul className="mt-2 space-y-1">
              {canStart.blockingDependencies?.map((dep: any, idx: number) => (
                <li key={idx} className="text-sm">
                  • {dep.taskTitle} ({getDependencyTypeLabel(dep.type)})
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {canStart && canStart.canStart && dependencies && dependencies.length > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Todas as dependências foram concluídas. Esta tarefa pode ser iniciada.
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Link2 className="mr-2 h-4 w-4" />
            Gerenciar Dependências
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dependências da Tarefa</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add New Dependency */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Adicionar Nova Dependência</h3>
              <div className="flex gap-2">
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma tarefa" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks.map((task: any) => (
                      <SelectItem key={task._id} value={task._id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={dependencyType} onValueChange={setDependencyType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finish_to_start">Término → Início</SelectItem>
                    <SelectItem value="start_to_start">Início → Início</SelectItem>
                    <SelectItem value="finish_to_finish">Término → Término</SelectItem>
                    <SelectItem value="start_to_finish">Início → Término</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleAddDependency}>Adicionar</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Esta tarefa depende da tarefa selecionada
              </p>
            </div>

            {/* Current Dependencies */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Dependências Atuais</h3>
              {dependencies && dependencies.length > 0 ? (
                <div className="space-y-2">
                  {dependencies.map((dep) => (
                    <div
                      key={dep._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{dep.dependsOnTask?.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getDependencyTypeLabel(dep.dependencyType)}
                          </Badge>
                          <Badge
                            variant={
                              dep.dependsOnTask?.status === "done" ||
                              dep.dependsOnTask?.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {dep.dependsOnTask?.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDependency(dep._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma dependência configurada
                </p>
              )}
            </div>

            {/* Tasks Depending on This */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Tarefas que Dependem desta</h3>
              {dependents && dependents.length > 0 ? (
                <div className="space-y-2">
                  {dependents.map((dep) => (
                    <div
                      key={dep._id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{dep.task?.title}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {getDependencyTypeLabel(dep.dependencyType)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa depende desta
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Summary */}
      {(dependencies && dependencies.length > 0) || (dependents && dependents.length > 0) ? (
        <div className="flex gap-2 text-xs text-muted-foreground">
          {dependencies && dependencies.length > 0 && (
            <span>Depende de: {dependencies.length}</span>
          )}
          {dependents && dependents.length > 0 && (
            <span>Bloqueia: {dependents.length}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}