import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";
import {
  taskPriorityValidator,
  taskStatusValidator,
  recurrencePatternValidator
} from "./schema";

// List tasks for a project
export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Enrich tasks with assignee name
    const tasksWithAssignee = await Promise.all(
      tasks.map(async (task) => {
        let assigneeName = null;
        if (task.assigneeId) {
          const assignee = await ctx.db.get(task.assigneeId);
          assigneeName = assignee?.name || null;
        }
        return {
          ...task,
          assigneeName,
        };
      })
    );

    return tasksWithAssignee;
  },
});

// Create a new task
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    priority: taskPriorityValidator,
    assigneeId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    parentTaskId: v.optional(v.id("tasks")),
    estimatedHours: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    progress: v.optional(v.number()),
    order: v.optional(v.number()),
    // Recurrence
    isRecurring: v.optional(v.boolean()),
    recurrencePattern: v.optional(recurrencePatternValidator),
    recurrenceInterval: v.optional(v.number()),
    recurrenceEndDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get current user by email
    let currentUser = null;
    const userEmail = identity.email;
    if (userEmail) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userEmail))
        .first();
    }

    // Get the last order if not provided
    let order = args.order;
    if (order === undefined) {
      const lastTask = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .first();
      order = lastTask ? (lastTask.order || 0) + 1 : 0;
    }

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      progress: args.progress || 0,
      order,
    });

    // Send notification if task is assigned to someone
    if (args.assigneeId) {
      await ctx.scheduler.runAfter(
        0,
        internal.notificationTriggers.triggerTaskNotification,
        {
          event: "task_assigned",
          taskId,
          taskTitle: args.title,
          projectId: args.projectId,
          details: `Uma nova ${args.parentTaskId ? 'subtarefa' : 'tarefa'} foi atribuída a você.`,
          assigneeId: args.assigneeId,
          actorId: currentUser?._id,
        }
      );
    }

    // Update project dates based on tasks
    await ctx.scheduler.runAfter(0, internal.projects.updateProjectDatesFromTasks, {
      projectId: args.projectId,
    });

    return taskId;
  },
});

// Update a task
export const update = mutation({
  args: {
    id: v.id("tasks"),
    patch: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      priority: v.optional(taskPriorityValidator),
      assigneeId: v.optional(v.id("users")),
      startDate: v.optional(v.number()),
      dueDate: v.optional(v.number()),
      parentTaskId: v.optional(v.id("tasks")),
      estimatedHours: v.optional(v.number()),
      estimatedCost: v.optional(v.number()),
      progress: v.optional(v.number()),
      order: v.optional(v.number()),
      isRecurring: v.optional(v.boolean()),
      recurrencePattern: v.optional(recurrencePatternValidator),
      recurrenceInterval: v.optional(v.number()),
      recurrenceEndDate: v.optional(v.number()),
      lastRecurrenceDate: v.optional(v.number()),
      dependencyTaskId: v.optional(v.id("tasks")),
      dependenciesEnabled: v.optional(v.boolean()),
      blockedByTaskIds: v.optional(v.array(v.id("tasks"))),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get current user by email
    let currentUser = null;
    const userEmail = identity.email;
    if (userEmail) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userEmail))
        .first();
    }

    // Get the old task to compare assignee
    const oldTask = await ctx.db.get(args.id);
    if (!oldTask) throw new Error("Task not found");

    await ctx.db.patch(args.id, args.patch);

    // Check if assignee changed and send notification
    if (args.patch.assigneeId && args.patch.assigneeId !== oldTask.assigneeId) {
      await ctx.scheduler.runAfter(
        0,
        internal.notificationTriggers.triggerTaskNotification,
        {
          event: "task_assigned",
          taskId: args.id,
          taskTitle: args.patch.title || oldTask.title,
          projectId: oldTask.projectId,
          details: `A ${oldTask.parentTaskId ? 'subtarefa' : 'tarefa'} foi reatribuída para você.`,
          assigneeId: args.patch.assigneeId,
          actorId: currentUser?._id,
        }
      );
    }

    // Check if status changed and notify assignee (if exists and not the actor)
    if (args.patch.status && args.patch.status !== oldTask.status && oldTask.assigneeId) {
      await ctx.scheduler.runAfter(
        0,
        internal.notificationTriggers.triggerTaskNotification,
        {
          event: "task_status_updated",
          taskId: args.id,
          taskTitle: args.patch.title || oldTask.title,
          projectId: oldTask.projectId,
          details: `O status da ${oldTask.parentTaskId ? 'subtarefa' : 'tarefa'} foi alterado para "${args.patch.status}".`,
          assigneeId: oldTask.assigneeId,
          actorId: currentUser?._id,
        }
      );
    }

    // Check if task was completed and notify assignee
    if (args.patch.status === "done" && oldTask.status !== "done" && oldTask.assigneeId) {
      await ctx.scheduler.runAfter(
        0,
        internal.notificationTriggers.triggerTaskNotification,
        {
          event: "task_completed",
          taskId: args.id,
          taskTitle: args.patch.title || oldTask.title,
          projectId: oldTask.projectId,
          details: `A ${oldTask.parentTaskId ? 'subtarefa' : 'tarefa'} foi marcada como concluída.`,
          assigneeId: oldTask.assigneeId,
          actorId: currentUser?._id,
        }
      );
    }

    // Update project dates if startDate or dueDate changed
    if (args.patch.startDate !== undefined || args.patch.dueDate !== undefined) {
      await ctx.scheduler.runAfter(0, internal.projects.updateProjectDatesFromTasks, {
        projectId: oldTask.projectId,
      });
    }
  },
});

// Delete a task and its subtasks recursively
export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get task to remember projectId before deletion
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    const projectId = task.projectId;

    await deleteTaskRecursive(ctx, args.id);

    // Update project dates after deletion
    await ctx.scheduler.runAfter(0, internal.projects.updateProjectDatesFromTasks, {
      projectId,
    });
  },
});

async function deleteTaskRecursive(ctx: any, taskId: Id<"tasks">) {
  // Find subtasks
  const subtasks = await ctx.db
    .query("tasks")
    .withIndex("by_parent", (q: any) => q.eq("parentTaskId", taskId))
    .collect();

  // Recursively delete subtasks
  for (const subtask of subtasks) {
    await deleteTaskRecursive(ctx, subtask._id);
  }

  // Delete dependencies where this task is the dependency
  const dependencies = await ctx.db
    .query("taskDependencies")
    .withIndex("by_depends_on", (q: any) => q.eq("dependsOnTaskId", taskId))
    .collect();
  
  for (const dep of dependencies) {
    await ctx.db.delete(dep._id);
  }

  // Delete dependencies where this task is the dependent
  const dependentTasks = await ctx.db
    .query("taskDependencies")
    .withIndex("by_task", (q: any) => q.eq("taskId", taskId))
    .collect();

  for (const dep of dependentTasks) {
    await ctx.db.delete(dep._id);
  }

  // Delete task tags
  const taskTags = await ctx.db
    .query("task_tags")
    .withIndex("by_task", (q: any) => q.eq("taskId", taskId))
    .collect();
  
  for (const tt of taskTags) {
    await ctx.db.delete(tt._id);
  }

  // Delete comments
  const comments = await ctx.db
    .query("comments")
    .withIndex("by_task", (q: any) => q.eq("taskId", taskId))
    .collect();
  
  for (const comment of comments) {
    await ctx.db.delete(comment._id);
  }

  // Finally delete the task itself
  await ctx.db.delete(taskId);
}

// Reorder a task
export const reorderTask = mutation({
  args: {
    id: v.id("tasks"),
    targetId: v.id("tasks"), // The task we're dropping on top of
    projectId: v.id("projects"),
    sameStatusOnly: v.optional(v.boolean()), // If true, only reorder within the same status
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get the task being moved and the target task
    const movedTask = await ctx.db.get(args.id);
    const targetTask = await ctx.db.get(args.targetId);

    if (!movedTask || !targetTask) {
      throw new Error("Task not found");
    }

    // Get all parent tasks in the project (or same status if specified)
    let query = ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId));

    const allTasks = await query.collect();

    // Filter parent tasks only and optionally by status
    let allTasksToReorder = allTasks.filter(t => !t.parentTaskId);

    if (args.sameStatusOnly) {
      allTasksToReorder = allTasksToReorder.filter(t => t.status === targetTask.status);
    }

    // Sort by current order
    allTasksToReorder.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Find current positions before removing
    const movedTaskIndex = allTasksToReorder.findIndex(t => t._id === args.id);
    const targetTaskIndex = allTasksToReorder.findIndex(t => t._id === args.targetId);

    // Remove the moved task from the array
    const filteredTasks = allTasksToReorder.filter(t => t._id !== args.id);

    // Find the index where we want to insert
    let targetIndex = filteredTasks.findIndex(t => t._id === args.targetId);

    // If moving down (from lower index to higher index), insert after the target
    // If moving up (from higher index to lower index), insert at the target position
    if (movedTaskIndex < targetTaskIndex) {
      targetIndex = targetIndex + 1;
    }

    // Insert the moved task at the target position
    filteredTasks.splice(targetIndex, 0, movedTask);

    // Update all tasks with new order values
    for (let i = 0; i < filteredTasks.length; i++) {
      const updates: any = { order: i };

      // If we're in Kanban mode and the moved task changed status, update its status
      if (args.sameStatusOnly && filteredTasks[i]._id === args.id && movedTask.status !== targetTask.status) {
        updates.status = targetTask.status;
      }

      await ctx.db.patch(filteredTasks[i]._id, updates);
    }
  },
});

// Reparent a subtask
export const reparentSubtask = mutation({
  args: {
    id: v.id("tasks"),
    parentTaskId: v.union(v.id("tasks"), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // If parentTaskId is null, it becomes a top-level task (undefined in schema for root)
    // But schema says parentTaskId is optional v.id("tasks").
    // So we can set it to undefined if null is passed, or just null if schema allows.
    // Schema: parentTaskId: v.optional(v.id("tasks"))
    // So we should set it to undefined to remove it.
    
    await ctx.db.patch(args.id, {
      parentTaskId: args.parentTaskId === null ? undefined : args.parentTaskId,
    });
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});