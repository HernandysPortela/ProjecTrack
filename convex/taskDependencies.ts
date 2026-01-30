import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";

// Add a dependency between tasks
export const addDependency = mutation({
  args: {
    taskId: v.id("tasks"),
    dependsOnTaskId: v.id("tasks"),
    dependencyType: v.optional(v.union(
      v.literal("finish_to_start"),
      v.literal("start_to_start"),
      v.literal("finish_to_finish"),
      v.literal("start_to_finish")
    )),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const dependsOnTask = await ctx.db.get(args.dependsOnTaskId);
    if (!dependsOnTask) throw new Error("Dependency task not found");

    // Prevent self-dependency
    if (args.taskId === args.dependsOnTaskId) {
      throw new Error("A task cannot depend on itself");
    }

    // Check if tasks are in the same project
    if (task.projectId !== dependsOnTask.projectId) {
      throw new Error("Tasks must be in the same project");
    }

    // Check for circular dependencies
    const wouldCreateCycle = await checkCircularDependency(
      ctx,
      args.dependsOnTaskId,
      args.taskId
    );

    if (wouldCreateCycle) {
      throw new Error("This dependency would create a circular dependency");
    }

    // Check if dependency already exists
    const existing = await ctx.db
      .query("taskDependencies")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.eq(q.field("dependsOnTaskId"), args.dependsOnTaskId))
      .first();

    if (existing) {
      throw new Error("This dependency already exists");
    }

    // Create the dependency
    await ctx.db.insert("taskDependencies", {
      taskId: args.taskId,
      dependsOnTaskId: args.dependsOnTaskId,
      dependencyType: args.dependencyType || "finish_to_start",
    });

    return { success: true };
  },
});

// Remove a dependency
export const removeDependency = mutation({
  args: {
    dependencyId: v.id("taskDependencies"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const dependency = await ctx.db.get(args.dependencyId);
    if (!dependency) throw new Error("Dependency not found");

    await ctx.db.delete(args.dependencyId);

    return { success: true };
  },
});

// Get all dependencies for a task
export const getTaskDependencies = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const dependencies = await ctx.db
      .query("taskDependencies")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const dependenciesWithDetails = await Promise.all(
      dependencies.map(async (dep) => {
        const dependsOnTask = await ctx.db.get(dep.dependsOnTaskId);
        return {
          ...dep,
          dependsOnTask,
        };
      })
    );

    return dependenciesWithDetails;
  },
});

// Get all tasks that depend on this task
export const getTaskDependents = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const dependents = await ctx.db
      .query("taskDependencies")
      .withIndex("by_depends_on", (q) => q.eq("dependsOnTaskId", args.taskId))
      .collect();

    const dependentsWithDetails = await Promise.all(
      dependents.map(async (dep) => {
        const task = await ctx.db.get(dep.taskId);
        return {
          ...dep,
          task,
        };
      })
    );

    return dependentsWithDetails;
  },
});

// Check if a task can be started based on its dependencies
export const canStartTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return { canStart: false, reason: "Task not found" };

    const dependencies = await ctx.db
      .query("taskDependencies")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    if (dependencies.length === 0) {
      return { canStart: true, reason: null };
    }

    const blockingDependencies = [];

    for (const dep of dependencies) {
      const dependsOnTask = await ctx.db.get(dep.dependsOnTaskId);
      if (!dependsOnTask) continue;

      // Check based on dependency type
      if (dep.dependencyType === "finish_to_start") {
        if (dependsOnTask.status !== "done" && dependsOnTask.status !== "completed") {
          blockingDependencies.push({
            taskTitle: dependsOnTask.title,
            type: "finish_to_start",
          });
        }
      } else if (dep.dependencyType === "start_to_start") {
        if (dependsOnTask.status === "todo" || dependsOnTask.status === "backlog") {
          blockingDependencies.push({
            taskTitle: dependsOnTask.title,
            type: "start_to_start",
          });
        }
      }
    }

    if (blockingDependencies.length > 0) {
      return {
        canStart: false,
        reason: "Blocked by dependencies",
        blockingDependencies,
      };
    }

    return { canStart: true, reason: null };
  },
});

// Helper function to check for circular dependencies
async function checkCircularDependency(
  ctx: any,
  startTaskId: Id<"tasks">,
  targetTaskId: Id<"tasks">,
  visited: Set<string> = new Set()
): Promise<boolean> {
  if (startTaskId === targetTaskId) {
    return true;
  }

  if (visited.has(startTaskId)) {
    return false;
  }

  visited.add(startTaskId);

  const dependencies = await ctx.db
    .query("taskDependencies")
    .withIndex("by_task", (q: any) => q.eq("taskId", startTaskId))
    .collect();

  for (const dep of dependencies) {
    const hasCycle = await checkCircularDependency(
      ctx,
      dep.dependsOnTaskId,
      targetTaskId,
      visited
    );
    if (hasCycle) {
      return true;
    }
  }

  return false;
}

// Get all tasks in a project with their dependency status
export const getProjectTasksWithDependencies = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const tasksWithDependencies = await Promise.all(
      tasks.map(async (task) => {
        const dependencies = await ctx.db
          .query("taskDependencies")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();

        const dependents = await ctx.db
          .query("taskDependencies")
          .withIndex("by_depends_on", (q) => q.eq("dependsOnTaskId", task._id))
          .collect();

        const dependenciesWithTasks = await Promise.all(
          dependencies.map(async (dep) => {
            const dependsOnTask = await ctx.db.get(dep.dependsOnTaskId);
            return { ...dep, dependsOnTask };
          })
        );

        const dependentsWithTasks = await Promise.all(
          dependents.map(async (dep) => {
            const dependentTask = await ctx.db.get(dep.taskId);
            return { ...dep, dependentTask };
          })
        );

        return {
          ...task,
          dependencies: dependenciesWithTasks,
          dependents: dependentsWithTasks,
        };
      })
    );

    return tasksWithDependencies;
  },
});