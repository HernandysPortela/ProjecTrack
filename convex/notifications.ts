import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get notification settings for a workgroup
export const getSettings = query({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    const workgroup = await ctx.db.get(args.workgroupId);
    if (!workgroup) return null;

    return workgroup.notificationSettings || {
      enabled: true,
      frequency: "immediate",
      events: [
        "task_created",
        "task_updated",
        "task_assigned",
        "task_completed",
        "project_created",
        "project_updated",
      ],
      recipients: [],
    };
  },
});

// Update notification settings for a workgroup
export const updateSettings = mutation({
  args: {
    workgroupId: v.id("workgroups"),
    settings: v.object({
      enabled: v.boolean(),
      frequency: v.string(),
      events: v.array(v.string()),
      recipients: v.array(v.id("users")),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const workgroup = await ctx.db.get(args.workgroupId);
    if (!workgroup) throw new Error("Workgroup not found");

    // Check if user is workgroup owner or has permission
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => u.email === identity.email);

    if (!user) throw new Error("User not found");
    if (workgroup.ownerId !== user._id && user.role !== "owner") {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.workgroupId, {
      notificationSettings: args.settings,
    });

    return { success: true };
  },
});

// Queue a notification
export const queueNotification = internalMutation({
  args: {
    userId: v.id("users"),
    workgroupId: v.id("workgroups"),
    event: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    entityName: v.string(),
    details: v.string(),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notificationQueue", {
      userId: args.userId,
      workgroupId: args.workgroupId,
      event: args.event,
      entityType: args.entityType,
      entityId: args.entityId,
      entityName: args.entityName,
      details: args.details,
      sent: false,
      scheduledFor: args.scheduledFor,
    });
  },
});

// Get pending notifications for a user
export const getPendingNotifications = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notificationQueue")
      .withIndex("by_user_and_sent", (q) =>
        q.eq("userId", args.userId).eq("sent", false)
      )
      .collect();
  },
});

// Get pending notifications by workgroup
export const getPendingByWorkgroup = internalQuery({
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

// Mark notification as sent
export const markAsSent = internalMutation({
  args: { notificationId: v.id("notificationQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { sent: true });
  },
});

// Log email sent
export const logEmail = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    subject: v.string(),
    event: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailLogs", {
      userId: args.userId,
      email: args.email,
      subject: args.subject,
      event: args.event,
      success: args.success,
      error: args.error,
    });
  },
});

// Get recent email logs for a user
export const getRecentEmailLogs = query({
  args: { 
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const logs = await ctx.db
      .query("emailLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
    
    return logs;
  },
});