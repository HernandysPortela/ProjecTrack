import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * One-time migration to normalize all task statuses and kanban column statuses in the database
 * Run this once to fix any inconsistent status values
 */
export const normalizeAllTaskStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Function to normalize status strings
    const normalizeStatus = (status: string): string => {
      const normalized = status.toLowerCase().replace(/\s+/g, '_');
      // Map common variations to standard statuses
      if (normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'in-progress') {
        return 'in_progress';
      }
      if (normalized === 'todo' || normalized === 'to_do' || normalized === 'to-do') {
        return 'todo';
      }
      if (normalized === 'done' || normalized === 'complete' || normalized === 'completed') {
        return 'done';
      }
      if (normalized === 'review' || normalized === 'in_review' || normalized === 'in-review') {
        return 'review';
      }
      if (normalized === 'blocked' || normalized === 'block') {
        return 'blocked';
      }
      return normalized;
    };

    // Get all tasks
    const allTasks = await ctx.db.query("tasks").collect();
    
    let updatedTasksCount = 0;
    const taskUpdates: Array<{ taskId: string; oldStatus: string; newStatus: string }> = [];

    for (const task of allTasks) {
      const normalizedStatus = normalizeStatus(task.status);
      
      if (task.status !== normalizedStatus) {
        taskUpdates.push({
          taskId: task._id,
          oldStatus: task.status,
          newStatus: normalizedStatus,
        });
        
        await ctx.db.patch(task._id, {
          status: normalizedStatus,
        });
        
        updatedTasksCount++;
      }
    }

    // Also normalize Kanban column statuses
    const allKanbanColumns = await ctx.db.query("kanban_columns").collect();
    let updatedColumnsCount = 0;
    const columnUpdates: Array<{ columnId: string; oldStatusKey: string; newStatusKey: string }> = [];

    for (const column of allKanbanColumns) {
      const normalizedStatusKey = normalizeStatus(column.statusKey);
      
      if (column.statusKey !== normalizedStatusKey) {
        columnUpdates.push({
          columnId: column._id,
          oldStatusKey: column.statusKey,
          newStatusKey: normalizedStatusKey,
        });
        
        await ctx.db.patch(column._id, {
          statusKey: normalizedStatusKey,
        });
        
        updatedColumnsCount++;
      }
    }

    console.log(`[Status Normalization] Updated ${updatedTasksCount} tasks and ${updatedColumnsCount} kanban columns`);
    console.log("[Task Updates]:", JSON.stringify(taskUpdates, null, 2));
    console.log("[Column Updates]:", JSON.stringify(columnUpdates, null, 2));

    return {
      success: true,
      totalTasks: allTasks.length,
      updatedTasksCount,
      totalColumns: allKanbanColumns.length,
      updatedColumnsCount,
      taskUpdates,
      columnUpdates,
    };
  },
});
