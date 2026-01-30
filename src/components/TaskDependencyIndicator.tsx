import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Link2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskDependencyIndicatorProps {
  taskId: Id<"tasks">;
}

export function TaskDependencyIndicator({ taskId }: TaskDependencyIndicatorProps) {
  const dependencies = useQuery(api.taskDependencies.getTaskDependencies, { taskId });
  const dependents = useQuery(api.taskDependencies.getTaskDependents, { taskId });
  const canStart = useQuery(api.taskDependencies.canStartTask, { taskId });

  if (!dependencies && !dependents) return null;

  const dependencyCount = dependencies?.length || 0;
  const dependentCount = dependents?.length || 0;
  const isBlocked = canStart && !canStart.canStart;

  if (dependencyCount === 0 && dependentCount === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Blocked indicator */}
        {isBlocked && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="text-xs px-1.5 py-0.5 gap-1">
                <AlertCircle className="h-3 w-3" />
                Bloqueada
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-semibold mb-1">Bloqueada por:</p>
                {canStart.blockingDependencies?.map((dep: any, idx: number) => (
                  <p key={idx}>• {dep.taskTitle}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Dependencies count */}
        {dependencyCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={isBlocked ? "destructive" : "secondary"} 
                className="text-xs px-1.5 py-0.5 gap-1"
              >
                <Link2 className="h-3 w-3" />
                {dependencyCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-semibold mb-1">Depende de {dependencyCount} tarefa(s):</p>
                {dependencies?.map((dep) => (
                  <p key={dep._id}>• {dep.dependsOnTask?.title}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Dependents count */}
        {dependentCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {dependentCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-semibold mb-1">Bloqueia {dependentCount} tarefa(s):</p>
                {dependents?.map((dep) => (
                  <p key={dep._id}>• {dep.task?.title}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
