import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Get reminder settings for a user in a workgroup
export const getSettings = query({
  args: { 
    userId: v.id("users"),
    workgroupId: v.id("workgroups") 
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("reminder_settings")
      .withIndex("by_user_and_workgroup", (q) =>
        q.eq("userId", args.userId).eq("workgroupId", args.workgroupId)
      )
      .first();

    // Return default settings if none exist
    return settings || {
      userId: args.userId,
      workgroupId: args.workgroupId,
      enabled: true,
      includeOverdue: true,
      notifyOnProjectChanges: true,
    };
  },
});

// Get all reminder settings for a user across all workgroups
export const getAllUserSettings = query({
  args: { 
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("reminder_settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return settings;
  },
});

// Update reminder settings
export const updateSettings = mutation({
  args: {
    userId: v.id("users"),
    workgroupId: v.id("workgroups"),
    enabled: v.boolean(),
    includeOverdue: v.boolean(),
    notifyOnProjectChanges: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reminder_settings")
      .withIndex("by_user_and_workgroup", (q) =>
        q.eq("userId", args.userId).eq("workgroupId", args.workgroupId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        includeOverdue: args.includeOverdue,
        notifyOnProjectChanges: args.notifyOnProjectChanges,
      });
    } else {
      await ctx.db.insert("reminder_settings", {
        userId: args.userId,
        workgroupId: args.workgroupId,
        enabled: args.enabled,
        includeOverdue: args.includeOverdue,
        notifyOnProjectChanges: args.notifyOnProjectChanges,
      });
    }

    return { success: true };
  },
});

// Check if a reminder was already sent
export const wasReminderSent = internalQuery({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
    reminderType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const twelveHoursAgo = now - 12 * 60 * 60 * 1000;

    const recentReminder = await ctx.db
      .query("reminder_log")
      .withIndex("by_task_and_user", (q) =>
        q.eq("taskId", args.taskId).eq("userId", args.userId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("reminderType"), args.reminderType),
          q.gte(q.field("sentAt"), twelveHoursAgo)
        )
      )
      .first();

    return !!recentReminder;
  },
});

// Log a sent reminder
export const logReminder = internalMutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
    reminderType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("reminder_log", {
      taskId: args.taskId,
      userId: args.userId,
      reminderType: args.reminderType,
      sentAt: Date.now(),
    });
  },
});

// Get all users with reminder settings enabled for a workgroup
export const getUsersWithRemindersEnabled = internalQuery({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reminder_settings")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();
  },
});

// Test function to manually send a reminder email
export const testReminderEmail = mutation({
  args: {
    userId: v.id("users"),
    workgroupId: v.id("workgroups"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.email) {
      throw new Error("User not found or has no email");
    }

    // Find a task assigned to this user in this workgroup
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();

    let task = null;
    for (const project of projects) {
      const projectTasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .filter((q) => q.eq(q.field("assigneeId"), args.userId))
        .first();
      
      if (projectTasks) {
        task = projectTasks;
        break;
      }
    }

    if (!task) {
      console.log("No task found for user, sending generic test email");
      
      // Try to use a real project name if available
      const fallbackProjectName = projects.length > 0 ? projects[0].name : "Projeto de Teste";

      // If no task found, send a generic test email
      await ctx.scheduler.runAfter(
        0,
        internal.emailService.sendReminderEmail,
        {
          userId: user._id,
          email: user.email,
          userName: user.name || "Usuário",
          taskTitle: "Tarefa de Teste (Exemplo)",
          taskId: "test_task_id" as any, 
          projectName: fallbackProjectName,
          dueDate: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
          hoursUntilDue: 24,
          isOverdue: false,
        }
      );
      return { 
        success: true, 
        message: `✅ Email de teste agendado para ${user.email}! Verifique sua caixa de entrada.` 
      };
    }

    const project = await ctx.db.get(task.projectId);
    if (!project) throw new Error("Project not found");

    const hoursUntilDue = task.dueDate 
      ? Math.floor((task.dueDate - Date.now()) / (1000 * 60 * 60))
      : 24;

    // Call the email action directly to get immediate feedback
    await ctx.scheduler.runAfter(
      0,
      internal.emailService.sendReminderEmail,
      {
        userId: user._id,
        email: user.email,
        userName: user.name || "User",
        taskTitle: task.title,
        taskId: task._id,
        projectName: project.name,
        dueDate: task.dueDate || Date.now(),
        hoursUntilDue,
        isOverdue: hoursUntilDue < 0,
      }
    );

    return { 
      success: true, 
      message: `✅ Test reminder email scheduled for ${user.email} for task: ${task.title}.` 
    };
  },
});