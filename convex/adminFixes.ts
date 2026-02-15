import { mutation } from "./_generated/server";

/**
 * Admin function to fix tasks with invalid or empty status
 * No authentication required - USE WITH CAUTION
 */
export const fixInvalidStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const validStatuses = ["todo", "in_progress", "review", "done", "blocked"];
    
    const allTasks = await ctx.db.query("tasks").collect();
    let fixedCount = 0;
    const fixes: Array<{ taskId: string; taskTitle: string; oldStatus: string }> = [];
    
    for (const task of allTasks) {
      if (!task.status || !validStatuses.includes(task.status)) {
        await ctx.db.patch(task._id, {
          status: "todo",
        });
        fixes.push({
          taskId: task._id,
          taskTitle: task.title,
          oldStatus: task.status || '(empty)',
        });
        fixedCount++;
      }
    }
    
    return {
      success: true,
      totalTasks: allTasks.length,
      fixedTasks: fixedCount,
      fixes,
    };
  },
});
