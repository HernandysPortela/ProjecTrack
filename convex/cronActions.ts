"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Daily reminder action - sends task reminders to all users
export const sendDailyReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting daily reminder process...");

    // Get all workgroups
    const workgroups = await ctx.runQuery(internal.cronHelpers.getAllWorkgroups);

    for (const workgroup of workgroups) {
      // Get users with reminders enabled for this workgroup
      const reminderSettings = await ctx.runQuery(
        internal.reminders.getUsersWithRemindersEnabled,
        { workgroupId: workgroup._id }
      );

      if (reminderSettings.length === 0) continue;

      // Get all projects in this workgroup
      const projects = await ctx.runQuery(
        internal.cronHelpers.getProjectsByWorkgroup,
        { workgroupId: workgroup._id }
      );

      // Process each user with reminders enabled
      for (const settings of reminderSettings) {
        const user = await ctx.runQuery(internal.cronHelpers.getUser, {
          userId: settings.userId,
        });

        if (!user || !user.email) continue;

        const overdueTasks = [];
        const upcomingTasks = [];
        const now = Date.now();
        const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;

        // Collect tasks for this user across all projects
        for (const project of projects) {
          const tasks = await ctx.runQuery(
            internal.cronHelpers.getTasksByProject,
            { projectId: project._id }
          );

          for (const task of tasks) {
            // Skip completed tasks
            if (task.status === "done" || !task.dueDate) continue;

            // Check if task is assigned to this user
            const isAssigned = task.assigneeId === settings.userId;

            if (!isAssigned) continue;

            const dueDate = new Date(task.dueDate).getTime();

            // Categorize tasks
            if (dueDate < now && settings.includeOverdue) {
              overdueTasks.push({ task, project });
            } else if (dueDate >= now && dueDate <= threeDaysFromNow) {
              upcomingTasks.push({ task, project });
            }
          }
        }

        // Send email if there are tasks to report
        if (overdueTasks.length > 0 || upcomingTasks.length > 0) {
          await ctx.runAction(internal.emailService.sendDailySummaryEmail, {
            userId: user._id,
            email: user.email,
            userName: user.name || "Usuário",
            workgroupName: workgroup.name,
            overdueTasks: overdueTasks.map((t) => ({
              taskId: t.task._id,
              taskTitle: t.task.title,
              projectName: t.project.name,
              dueDate: t.task.dueDate!,
              priority: t.task.priority || "medium",
            })),
            upcomingTasks: upcomingTasks.map((t) => ({
              taskId: t.task._id,
              taskTitle: t.task.title,
              projectName: t.project.name,
              dueDate: t.task.dueDate!,
              priority: t.task.priority || "medium",
            })),
          });

          console.log(
            `Sent daily summary to ${user.email}: ${overdueTasks.length} overdue, ${upcomingTasks.length} upcoming`
          );
        }
      }
    }

    console.log("Daily reminder process completed");
    return { success: true };
  },
});
