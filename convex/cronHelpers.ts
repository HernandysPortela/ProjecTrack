import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const getWorkgroupsWithDailyDigest = internalQuery({
  args: {},
  handler: async (ctx) => {
    const workgroups = await ctx.db.query("workgroups").collect();
    return workgroups.filter(
      (w) =>
        w.notificationSettings?.enabled &&
        w.notificationSettings?.frequency === "daily"
    );
  },
});

export const getWorkgroupsWithWeeklyDigest = internalQuery({
  args: {},
  handler: async (ctx) => {
    const workgroups = await ctx.db.query("workgroups").collect();
    return workgroups.filter(
      (w) =>
        w.notificationSettings?.enabled &&
        w.notificationSettings?.frequency === "weekly"
    );
  },
});

export const getPendingNotificationsForWorkgroup = internalQuery({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notificationQueue")
      .withIndex("by_workgroup_and_sent", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("sent", false)
      )
      .collect();
  },
});

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getProject = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

export const getWorkgroup = internalQuery({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workgroupId);
  },
});

export const getTasksDueSoonOrOverdue = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const tomorrow = now + 24 * 60 * 60 * 1000;
    
    const allTasks = await ctx.db.query("tasks").collect();
    
    return allTasks.filter((task) => {
      if (!task.dueDate || task.status === "done") return false;
      const dueDate = new Date(task.dueDate).getTime();
      return dueDate < tomorrow; // Due within 24 hours or overdue
    });
  },
});

export const getAllWorkgroups = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("workgroups").collect();
  },
});

export const getProjectsByWorkgroup = internalQuery({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();
  },
});

export const getTasksByProject = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});