import { v } from "convex/values";
import { internalMutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Trigger notification when task is created/updated/deleted
export const triggerTaskNotification = internalMutation({
  args: {
    event: v.string(),
    taskId: v.id("tasks"),
    taskTitle: v.string(),
    projectId: v.id("projects"),
    details: v.string(),
    assigneeId: v.optional(v.id("users")),
    actorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get project and workgroup info
    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    const workgroup = await ctx.db.get(project.workgroupId);
    if (!workgroup) return;

    // Check notification settings
    const settings = workgroup.notificationSettings || {
      enabled: true,
      frequency: "immediate",
      events: [
        "task_created",
        "task_updated",
        "task_assigned",
        "task_completed",
        "task_status_updated",
        "comment_added",
      ],
      recipients: [],
    };

    // If notifications are disabled or this event is not in the list, skip
    if (!settings.enabled || !settings.events.includes(args.event)) {
      return;
    }

    // Determine who should receive the notification
    let recipientIds: Id<"users">[] = [];

    // Events that should notify the assignee directly
    const assigneeEvents = [
      "task_assigned",
      "task_status_updated",
      "task_completed",
      "comment_added"
    ];

    if (assigneeEvents.includes(args.event) && args.assigneeId) {
      // For these events, notify the assignee
      recipientIds = [args.assigneeId];
    } else if (settings.recipients.length > 0) {
      // Use configured recipients
      recipientIds = settings.recipients;
    } else {
      // Default: notify workgroup owner
      recipientIds = [workgroup.ownerId];
    }

    // Queue notifications for each recipient
    for (const userId of recipientIds) {
      // Skip if the actor is the same as the recipient (don't notify yourself)
      if (args.actorId && userId === args.actorId) continue;

      const user = await ctx.db.get(userId);
      if (!user || !user.email) continue;

      // For immediate notifications, send email right away
      if (settings.frequency === "immediate") {
        await ctx.scheduler.runAfter(
          0,
          internal.emailService.sendNotificationEmail,
          {
            userId: user._id,
            email: user.email,
            userName: user.name || "User",
            event: args.event,
            entityType: "task",
            entityName: args.taskTitle,
            details: args.details,
            workgroupName: workgroup.name,
            projectName: project.name,
            assigneeName: user.name,
          }
        );

        // Log the email
        await ctx.db.insert("emailLogs", {
          userId: user._id,
          email: user.email,
          subject: `Task Notification: ${args.taskTitle}`,
          event: args.event,
          success: true,
        });
      } else {
        // Queue for digest
        await ctx.db.insert("notificationQueue", {
          userId: user._id,
          workgroupId: workgroup._id,
          event: args.event,
          entityType: "task",
          entityId: args.taskId,
          entityName: args.taskTitle,
          details: args.details,
          sent: false,
        });
      }
    }
  },
});

// Trigger notification when project is created/updated/deleted
export const triggerProjectNotification = internalMutation({
  args: {
    event: v.string(),
    projectId: v.id("projects"),
    projectName: v.string(),
    workgroupId: v.id("workgroups"),
    details: v.string(),
    actorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const workgroup = await ctx.db.get(args.workgroupId);
    if (!workgroup) return;

    // Check notification settings
    const settings = workgroup.notificationSettings || {
      enabled: true,
      frequency: "immediate",
      events: ["project_created", "project_updated", "project_deleted"],
      recipients: [],
    };

    // If notifications are disabled or this event is not in the list, skip
    if (!settings.enabled || !settings.events.includes(args.event)) {
      return;
    }

    // Determine recipients
    const recipientIds = settings.recipients.length > 0 
      ? settings.recipients 
      : [workgroup.ownerId];

    // Queue notifications for each recipient
    for (const userId of recipientIds) {
      // Skip if the actor is the same as the recipient
      if (args.actorId && userId === args.actorId) continue;

      const user = await ctx.db.get(userId);
      if (!user || !user.email) continue;

      // For immediate notifications, send email right away
      if (settings.frequency === "immediate") {
        await ctx.scheduler.runAfter(
          0,
          internal.emailService.sendNotificationEmail,
          {
            userId: user._id,
            email: user.email,
            userName: user.name || "User",
            event: args.event,
            entityType: "project",
            entityName: args.projectName,
            details: args.details,
            workgroupName: workgroup.name,
          }
        );

        // Log the email
        await ctx.db.insert("emailLogs", {
          userId: user._id,
          email: user.email,
          subject: `Project Notification: ${args.projectName}`,
          event: args.event,
          success: true,
        });
      } else {
        // Queue for digest
        await ctx.db.insert("notificationQueue", {
          userId: user._id,
          workgroupId: workgroup._id,
          event: args.event,
          entityType: "project",
          entityId: args.projectId,
          entityName: args.projectName,
          details: args.details,
          sent: false,
        });
      }
    }
  },
});