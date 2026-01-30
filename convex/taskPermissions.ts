import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const grantAccess = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
    canView: v.boolean(),
    canEdit: v.boolean(),
    isBlocked: v.optional(v.boolean()),
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
      throw new Error("Only administrators or project managers can manage task permissions");
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
        canView: args.canView,
        canEdit: args.canEdit,
        isBlocked: args.isBlocked,
      });
    } else {
      await ctx.db.insert("task_permissions", {
        taskId: args.taskId,
        userId: args.userId,
        canView: args.canView,
        canEdit: args.canEdit,
        isBlocked: args.isBlocked,
      });
    }
  },
});

export const revokeAccess = mutation({
  args: {
    permissionId: v.id("task_permissions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const permission = await ctx.db.get(args.permissionId);
    if (!permission) throw new Error("Permission not found");

    const task = await ctx.db.get(permission.taskId);
    if (!task) throw new Error("Task not found");

    const project = await ctx.db.get(task.projectId);
    if (!project) throw new Error("Project not found");

    // Check if user is admin/manager or project manager
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", userId)
      )
      .first();

    const isAdmin = membership?.role === "owner" || membership?.role === "manager";
    const isProjectManager = project.managerId === userId;

    if (!isAdmin && !isProjectManager) {
      throw new Error("Only administrators or project managers can manage task permissions");
    }

    await ctx.db.delete(args.permissionId);
  },
});

export const listTaskPermissions = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const permissions = await ctx.db
      .query("task_permissions")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const permissionsWithUsers = await Promise.all(
      permissions.map(async (perm) => {
        const user = await ctx.db.get(perm.userId);
        return {
          ...perm,
          userName: user?.name || user?.email || "Unknown",
          userEmail: user?.email || "",
          isBlocked: perm.isBlocked || false,
        };
      })
    );

    return permissionsWithUsers;
  },
});

export const checkTaskAccess = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { canView: false, canEdit: false };

    const task = await ctx.db.get(args.taskId);
    if (!task) return { canView: false, canEdit: false };

    const project = await ctx.db.get(task.projectId);
    if (!project) return { canView: false, canEdit: false };

    // Check if user is admin/manager or project manager
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", userId)
      )
      .first();

    const isAdmin = membership?.role === "owner" || membership?.role === "manager";
    const isProjectManager = project.managerId === userId;

    // Admins and project managers have full access
    if (isAdmin || isProjectManager) {
      return { canView: true, canEdit: true };
    }

    // Check specific permissions
    const permission = await ctx.db
      .query("task_permissions")
      .withIndex("by_task_and_user", (q) =>
        q.eq("taskId", args.taskId).eq("userId", userId)
      )
      .first();

    if (permission) {
      // If user is explicitly blocked, deny all access
      if (permission.isBlocked) {
        return { canView: false, canEdit: false };
      }
      return { canView: permission.canView, canEdit: permission.canEdit };
    }

    // Default: members can view but not edit
    return { canView: true, canEdit: false };
  },
});
