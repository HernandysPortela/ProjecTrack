import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { TaskDetailsDialog } from "@/components/project/TaskDetailsDialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface TaskDetailsLoaderProps {
  taskId: Id<"tasks">;
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsLoader({
  taskId,
  projectId,
  open,
  onOpenChange,
}: TaskDetailsLoaderProps) {
  // Fetch task context data
  const projectMembers = useQuery(api.projectMembers.listMembers, { projectId });
  const allTags = useQuery(api.tags.list, { projectId });
  const taskTagsList = useQuery(api.tags.getTaskTags, { taskId });
  const task = useQuery(api.tasks.get, { id: taskId });

  // Formatting members for the dialog
  // TaskDetailsDialog often expects 'members' to be user objects or member objects with user details
  const members = projectMembers?.map(m => m.user || m) || [];
  
  // Tags logic
  const tags = allTags || [];
  // Transform to match TaskDetailsDialog expected format: { _id, tagId, tagName, tagColor }
  const taskTags = taskTagsList?.map(t => ({
    _id: t.taskTagId, 
    tagId: t._id,
    tagName: t.name,
    tagColor: t.color
  })) || [];

  // Mutations
  const updateTask = useMutation(api.tasks.update);
  const addTagToTask = useMutation(api.tags.addTagToTask);
  const removeTagFromTask = useMutation(api.tags.removeTagFromTask);
  const createComment = useMutation(api.comments.create);

  const [newComment, setNewComment] = useState("");

  const handleUpdateTask = async (updates: any) => {
    try {
      await updateTask({
        id: taskId,
        patch: updates
      });
      toast.success("Tarefa atualizada com sucesso");
    } catch (error) {
      console.error("Failed to update task", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleAddTag = async (tagId: Id<"tags">) => {
    try {
      await addTagToTask({ taskId, tagId });
    } catch (error) {
      toast.error("Erro ao adicionar tag");
    }
  };

  const handleRemoveTag = async (id: Id<"task_tags">) => {
    try {
      await removeTagFromTask({ taskTagId: id });
    } catch (error) {
      toast.error("Erro ao remover tag");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await createComment({
        taskId,
        body: newComment
      });
      setNewComment("");
    } catch (error) {
      toast.error("Erro ao adicionar comentário");
    }
  };

  if (!task) return null;

  return (
    <TaskDetailsDialog
      open={open}
      onOpenChange={onOpenChange}
      task={task}
      projectId={projectId}
      members={members}
      tags={tags}
      taskTags={taskTags}
      onUpdateTask={handleUpdateTask}
      onAddTag={handleAddTag}
      onRemoveTag={handleRemoveTag}
      onAddComment={handleAddComment}
      newComment={newComment}
      setNewComment={setNewComment}
    />
  );
}
