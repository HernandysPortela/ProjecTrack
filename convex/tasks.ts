import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
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

    // Enrich tasks with assignee name and avatar
    const tasksWithAssignee = await Promise.all(
      tasks.map(async (task) => {
        let assigneeName = null;
        let assigneeAvatar = null;
        if (task.assigneeId) {
          const assignee = await ctx.db.get(task.assigneeId);
          assigneeName = assignee?.name || null;
          
          // Get avatar URL if exists
          if (assignee?.imageId) {
            const url = await ctx.storage.getUrl(assignee.imageId);
            assigneeAvatar = url || null;
          } else if (assignee?.image) {
            assigneeAvatar = assignee.image;
          }
        }
        return {
          ...task,
          assigneeName,
          assigneeAvatar,
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
    status: v.optional(taskStatusValidator),
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
      status: args.status || "todo", // Default to 'todo' if not provided
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
      status: v.optional(taskStatusValidator),
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

    // Get all tasks in the project
    let query = ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId));

    const allTasks = await query.collect();

    // Determine if we're reordering subtasks or parent tasks
    // Both moved and target must share the same parentTaskId (or both be root)
    const parentId = movedTask.parentTaskId || null;
    
    let allTasksToReorder: Doc<"tasks">[];
    
    if (parentId) {
      // Reordering subtasks: filter siblings with the same parent
      allTasksToReorder = allTasks.filter(t => t.parentTaskId === parentId);
    } else {
      // Reordering parent (root) tasks
      allTasksToReorder = allTasks.filter(t => !t.parentTaskId);
    }

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

// Move a task (and its subtasks) to another project
export const moveToProject = mutation({
  args: {
    taskId: v.id("tasks"),
    targetProjectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const targetProject = await ctx.db.get(args.targetProjectId);
    if (!targetProject) throw new Error("Target project not found");

    if (task.projectId === args.targetProjectId) {
      throw new Error("Task is already in this project");
    }

    const sourceProjectId = task.projectId;

    // Move main task: set new projectId, remove parentTaskId (becomes root in new project)
    const lastTask = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.targetProjectId))
      .order("desc")
      .first();
    const newOrder = lastTask ? (lastTask.order || 0) + 1 : 0;

    await ctx.db.patch(args.taskId, {
      projectId: args.targetProjectId,
      parentTaskId: undefined,
      order: newOrder,
    });

    // Recursively move all subtasks to the new project
    const moveSubtasks = async (parentId: Id<"tasks">) => {
      const subtasks = await ctx.db
        .query("tasks")
        .withIndex("by_parent", (q: any) => q.eq("parentTaskId", parentId))
        .collect();
      for (const subtask of subtasks) {
        await ctx.db.patch(subtask._id, {
          projectId: args.targetProjectId,
        });
        await moveSubtasks(subtask._id);
      }
    };
    await moveSubtasks(args.taskId);

    // Clean up dependencies that reference tasks in the old project
    // (cross-project dependencies are not supported)
    const deps = await ctx.db
      .query("taskDependencies")
      .withIndex("by_task", (q: any) => q.eq("taskId", args.taskId))
      .collect();
    for (const dep of deps) {
      const depTask = await ctx.db.get(dep.dependsOnTaskId);
      if (depTask && depTask.projectId !== args.targetProjectId) {
        await ctx.db.delete(dep._id);
      }
    }

    // Update project dates for both projects
    await ctx.scheduler.runAfter(0, internal.projects.updateProjectDatesFromTasks, {
      projectId: sourceProjectId,
    });
    await ctx.scheduler.runAfter(0, internal.projects.updateProjectDatesFromTasks, {
      projectId: args.targetProjectId,
    });

    return args.taskId;
  },
});

// Convert a task into a new project (with its subtasks becoming tasks)
export const convertToProject = mutation({
  args: {
    taskId: v.id("tasks"),
    projectName: v.optional(v.string()),
    projectColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const currentUser = await ctx.db.get(userId);
    if (!currentUser) throw new Error("User not found");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const sourceProject = await ctx.db.get(task.projectId);
    if (!sourceProject) throw new Error("Source project not found");

    // Create new project from the task
    const newProjectId = await ctx.db.insert("projects", {
      workgroupId: sourceProject.workgroupId,
      folderId: sourceProject.folderId,
      ownerId: currentUser._id,
      name: args.projectName || task.title,
      description: task.description,
      startDate: task.startDate,
      endDate: task.dueDate,
      color: args.projectColor || sourceProject.color,
      status: "in_progress",
    });

    // Add current user as project owner member
    await ctx.db.insert("project_members", {
      projectId: newProjectId,
      userId: currentUser._id,
      role: "owner",
    });

    // Get all subtasks of this task
    const subtasks = await ctx.db
      .query("tasks")
      .withIndex("by_parent", (q: any) => q.eq("parentTaskId", args.taskId))
      .collect();

    // Move subtasks to the new project as root tasks
    for (let i = 0; i < subtasks.length; i++) {
      await ctx.db.patch(subtasks[i]._id, {
        projectId: newProjectId,
        parentTaskId: undefined,
        order: i,
      });

      // Recursively update nested subtasks' projectId
      const updateChildren = async (parentId: Id<"tasks">) => {
        const children = await ctx.db
          .query("tasks")
          .withIndex("by_parent", (q: any) => q.eq("parentTaskId", parentId))
          .collect();
        for (const child of children) {
          await ctx.db.patch(child._id, {
            projectId: newProjectId,
          });
          await updateChildren(child._id);
        }
      };
      await updateChildren(subtasks[i]._id);
    }

    // Delete the original task (it's now a project)
    // First clean up its dependencies, tags, comments, etc.
    const taskDeps = await ctx.db
      .query("taskDependencies")
      .withIndex("by_task", (q: any) => q.eq("taskId", args.taskId))
      .collect();
    for (const dep of taskDeps) {
      await ctx.db.delete(dep._id);
    }
    const taskDepsReverse = await ctx.db
      .query("taskDependencies")
      .withIndex("by_depends_on", (q: any) => q.eq("dependsOnTaskId", args.taskId))
      .collect();
    for (const dep of taskDepsReverse) {
      await ctx.db.delete(dep._id);
    }
    const taskTags = await ctx.db
      .query("task_tags")
      .withIndex("by_task", (q: any) => q.eq("taskId", args.taskId))
      .collect();
    for (const tt of taskTags) {
      await ctx.db.delete(tt._id);
    }
    const taskComments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q: any) => q.eq("taskId", args.taskId))
      .collect();
    for (const comment of taskComments) {
      await ctx.db.delete(comment._id);
    }
    const taskAttachments = await ctx.db
      .query("attachments")
      .withIndex("by_task", (q: any) => q.eq("taskId", args.taskId))
      .collect();
    for (const att of taskAttachments) {
      await ctx.db.delete(att._id);
    }
    const taskChecklist = await ctx.db
      .query("checklist_items")
      .withIndex("by_task", (q: any) => q.eq("taskId", args.taskId))
      .collect();
    for (const item of taskChecklist) {
      await ctx.db.delete(item._id);
    }

    // Delete the original task
    await ctx.db.delete(args.taskId);

    // Update source project dates
    await ctx.scheduler.runAfter(0, internal.projects.updateProjectDatesFromTasks, {
      projectId: task.projectId,
    });

    // Update new project dates
    await ctx.scheduler.runAfter(0, internal.projects.updateProjectDatesFromTasks, {
      projectId: newProjectId,
    });

    return newProjectId;
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});