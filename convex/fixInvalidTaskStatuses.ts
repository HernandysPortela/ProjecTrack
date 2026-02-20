import { mutation } from "./_generated/server";
import { TASK_STATUS } from "./schema";

// Este script corrige todas as tarefas com status inválido ou vazio
export const fixInvalidStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    // Buscar todas as tarefas
    const allTasks = await ctx.db.query("tasks").collect();
    
    const validStatuses = [
      TASK_STATUS.TODO,
      TASK_STATUS.IN_PROGRESS,
      TASK_STATUS.REVIEW,
      TASK_STATUS.DONE,
      TASK_STATUS.BLOCKED,
    ];
    
    let fixedCount = 0;
    
    for (const task of allTasks) {
      // Se o status for vazio, nulo ou não estiver na lista de status válidos
      if (!task.status || !validStatuses.includes(task.status as any)) {
        await ctx.db.patch(task._id, {
          status: TASK_STATUS.TODO, // Define como 'todo' por padrão
        });
        fixedCount++;
        console.log(`Fixed task ${task._id}: "${task.status || 'empty'}" -> "${TASK_STATUS.TODO}"`);
      }
    }
    
    return {
      message: `Fixed ${fixedCount} tasks with invalid status`,
      totalTasks: allTasks.length,
      fixedTasks: fixedCount,
    };
  },
});
