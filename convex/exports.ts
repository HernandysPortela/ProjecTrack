import { query } from "./_generated/server";
import { v } from "convex/values";

// Get workgroup summary with all projects and their tasks
export const getWorkgroupExportData = query({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();

    const projectsWithTasks = await Promise.all(
      projects.map(async (project) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const tasksWithDetails = await Promise.all(
          tasks.map(async (task) => {
            let assigneeName = "Unassigned";
            if (task.assigneeId) {
              const assignee = await ctx.db.get(task.assigneeId);
              assigneeName = assignee?.name || "Unknown";
            }

            return {
              _id: task._id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              assigneeName,
              dueDate: task.dueDate,
              estimatedCost: task.estimatedCost,
              estimatedHours: task.estimatedHours,
              parentTaskId: task.parentTaskId,
            };
          })
        );

        const totalCost = tasksWithDetails.reduce((sum, task) => sum + (task.estimatedCost || 0), 0);

        return {
          _id: project._id,
          name: project.name,
          description: project.description,
          status: project.status,
          color: project.color,
          taskCount: tasks.length,
          tasks: tasksWithDetails,
          totalCost,
        };
      })
    );

    return projectsWithTasks;
  },
});