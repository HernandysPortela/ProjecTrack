import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const blockUserFromTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const project = await ctx.db.get(task.projectId);
    if (!project) throw new Error("Project not found");

    // Check if user is admin/manager or project manager
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", currentUserId)
      )
      .first();

    const isAdmin = membership?.role === "owner" || membership?.role === "manager";
    const isProjectManager = project.managerId === currentUserId;

    if (!isAdmin && !isProjectManager) {
      throw new Error("Only administrators or project managers can block users from tasks");
    }

    // Check if permission already exists
    const existing = await ctx.db
      .query("task_permissions")
      .withIndex("by_task_and_user", (q) =>
        q.eq("taskId", args.taskId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isBlocked: true,
        canView: false,
        canEdit: false,
      });
    } else {
      await ctx.db.insert("task_permissions", {
        taskId: args.taskId,
        userId: args.userId,
        canView: false,
        canEdit: false,
        isBlocked: true,
      });
    }
  },
});

export const unblockUserFromTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const project = await ctx.db.get(task.projectId);
    if (!project) throw new Error("Project not found");

    // Check if user is admin/manager or project manager
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", currentUserId)
      )
      .first();

    const isAdmin = membership?.role === "owner" || membership?.role === "manager";
    const isProjectManager = project.managerId === currentUserId;

    if (!isAdmin && !isProjectManager) {
      throw new Error("Only administrators or project managers can unblock users from tasks");
    }

    const existing = await ctx.db
      .query("task_permissions")
      .withIndex("by_task_and_user", (q) =>
        q.eq("taskId", args.taskId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isBlocked: false,
        canView: true,
        canEdit: false,
      });
    }
  },
});
