import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // Get all workgroups the user is a member of
    const memberships = await ctx.db
      .query("workgroup_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const workgroupIds = memberships.map((m) => m.workgroupId);

    console.log(`[Dashboard] User ${user._id} is in ${workgroupIds.length} workgroups`);

    // Get all projects from user's workgroups
    const allProjects = await ctx.db.query("projects").collect();
    const userProjects = allProjects.filter((p) =>
      workgroupIds.includes(p.workgroupId)
    );

    // Get all tasks from user's projects OR assigned to the user
    const projectIds = userProjects.map((p) => p._id);
    const allTasks = await ctx.db.query("tasks").collect();
    const userTasks = allTasks.filter((t) => 
      projectIds.includes(t.projectId) || t.assigneeId === user._id
    );

    // Calculate statistics
    const now = Date.now();
    const overdueTasks = userTasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "done"
    );

    // Get ALL tasks assigned to the user using the index for better performance
    const myTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", user._id))
      .collect();
    
    // Filter out tasks from deleted projects
    const myTasksFiltered = [];
    for (const task of myTasks) {
      const project = await ctx.db.get(task.projectId);
      if (project) {
        myTasksFiltered.push(task);
      }
    }
    
    console.log(`[Dashboard] User ${user._id} (${user.email}) has ${myTasksFiltered.length} tasks assigned (filtered from ${myTasks.length})`);
    
    const myOverdueTasks = myTasksFiltered.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "done"
    );

    // Get all possible statuses from Kanban columns across all projects
    const allKanbanColumns = await ctx.db.query("kanban_columns").collect();
    const projectKanbanColumns = allKanbanColumns.filter((col) =>
      projectIds.includes(col.projectId)
    );

    // Function to normalize status strings
    const normalizeStatus = (status: string): string => {
      const normalized = status.toLowerCase().replace(/\s+/g, '_');
      // Map common variations to standard statuses
      if (normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'in-progress') {
        return 'in_progress';
      }
      if (normalized === 'todo' || normalized === 'to_do' || normalized === 'to-do') {
        return 'todo';
      }
      if (normalized === 'done' || normalized === 'complete' || normalized === 'completed') {
        return 'done';
      }
      if (normalized === 'review' || normalized === 'in_review' || normalized === 'in-review') {
        return 'review';
      }
      if (normalized === 'blocked' || normalized === 'block') {
        return 'blocked';
      }
      return normalized;
    };

    // Define default statuses
    const defaultStatuses = ["todo", "in_progress", "review", "done", "blocked"];
    
    // Collect all unique status keys from custom columns and defaults - normalize them all
    const allStatusKeys = new Set<string>([
      ...defaultStatuses,
      ...projectKanbanColumns.map((col) => normalizeStatus(col.statusKey)),
    ]);

    // Initialize task counts for all statuses
    const tasksByStatus: Record<string, number> = {};
    for (const statusKey of allStatusKeys) {
      tasksByStatus[statusKey] = 0;
    }

    // Count tasks by status (only for tasks with valid projects)
    for (const task of userTasks) {
      const project = await ctx.db.get(task.projectId);
      if (project) {
        const normalizedStatus = normalizeStatus(task.status);
        if (tasksByStatus[normalizedStatus] !== undefined) {
          tasksByStatus[normalizedStatus]++;
        } else {
          tasksByStatus[normalizedStatus] = 1;
        }
      }
    }

    // Get recent activity - filter to show only activities related to the current user
    // This includes: activities by the user, or activities on tasks assigned to the user, or activities on user's projects
    const allRecentActivity = await ctx.db
      .query("activity_log")
      .order("desc")
      .take(50); // Take more initially to filter down to 5 relevant ones

    const activityWithDetails = await Promise.all(
      allRecentActivity.map(async (activity) => {
        const activityUser = await ctx.db.get(activity.userId);
        const task = activity.taskId ? await ctx.db.get(activity.taskId) : null;
        const project = activity.projectId
          ? await ctx.db.get(activity.projectId)
          : null;

        // Determine if this activity is relevant to the current user
        const isRelevant = 
          activity.userId === user._id || // Activity by the user
          (task && task.assigneeId === user._id) || // Activity on user's task
          (project && projectIds.includes(project._id)); // Activity on user's project

        return {
          ...activity,
          userName: activityUser?.name || "Unknown",
          taskTitle: task?.title,
          projectName: project?.name,
          isRelevant,
        };
      })
    );

    // Filter to only relevant activities and limit to 5
    const filteredActivity = activityWithDetails
      .filter((a) => a.isRelevant)
      .slice(0, 5);

    // Get upcoming tasks (due in next 7 days) - limit to 5 for faster loading
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const upcomingTasksRaw = userTasks
      .filter(
        (t) =>
          t.dueDate &&
          t.dueDate > now &&
          t.dueDate <= sevenDaysFromNow &&
          t.status !== "done"
      )
      .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
      .slice(0, 5);

    const upcomingTasksWithDetails = (await Promise.all(
      upcomingTasksRaw.map(async (task) => {
        const assignee = task.assigneeId ? await ctx.db.get(task.assigneeId) : null;
        const project = await ctx.db.get(task.projectId);
        if (!project) return null; // Filter out tasks from deleted projects
        return {
          ...task,
          assigneeName: assignee?.name || null,
          projectName: project.name,
        };
      })
    )).filter((t) => t !== null);

    // Get overdue tasks with details - limit to 5 for faster loading
    const overdueTasksWithDetails = (await Promise.all(
      overdueTasks.slice(0, 5).map(async (task) => {
        const assignee = task.assigneeId ? await ctx.db.get(task.assigneeId) : null;
        const project = await ctx.db.get(task.projectId);
        if (!project) return null; // Filter out tasks from deleted projects
        return {
          ...task,
          assigneeName: assignee?.name || null,
          projectName: project.name,
        };
      })
    )).filter((t) => t !== null);

    // Get on-time tasks (tasks with due dates in the future, not done) - limit to 5 for faster loading
    const onTimeTasksRaw = userTasks
      .filter(
        (t) =>
          t.dueDate &&
          t.dueDate >= now &&
          t.status !== "done"
      )
      .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
      .slice(0, 5);

    const onTimeTasksWithDetails = (await Promise.all(
      onTimeTasksRaw.map(async (task) => {
        const assignee = task.assigneeId ? await ctx.db.get(task.assigneeId) : null;
        const project = await ctx.db.get(task.projectId);
        if (!project) return null; // Filter out tasks from deleted projects
        return {
          ...task,
          assigneeName: assignee?.name || null,
          projectName: project.name,
        };
      })
    )).filter((t) => t !== null);

    // Get tasks assigned to current user with full details
    const allMyTasksWithDetails = (await Promise.all(
      myTasksFiltered.map(async (task) => {
        const project = await ctx.db.get(task.projectId);
        if (!project) return null; // Filter out tasks from deleted projects
        const workgroup = await ctx.db.get(project.workgroupId);
        const assignee = task.assigneeId ? await ctx.db.get(task.assigneeId) : null;
        return {
          ...task,
          projectId: task.projectId,
          workgroupId: project.workgroupId,
          projectName: project.name,
          workgroupName: workgroup?.name || "Unknown",
          assignee: assignee ? {
            _id: assignee._id,
            name: assignee.name,
            email: assignee.email,
            imageUrl: assignee.image,
          } : null,
        };
      })
    )).filter((t) => t !== null);

    // Filter to only include tasks from projects OUTSIDE user's workgroups
    const myExternalTasksWithDetails = allMyTasksWithDetails.filter(
      (task) => task && !projectIds.includes(task.projectId)
    );

    // Get ALL accessible tasks (from user's projects OR assigned to user) with details
    const allAccessibleTasksWithDetails = (await Promise.all(
      userTasks.map(async (task) => {
        const project = await ctx.db.get(task.projectId);
        if (!project) return null; // Filter out tasks from deleted projects
        const workgroup = await ctx.db.get(project.workgroupId);
        const assignee = task.assigneeId ? await ctx.db.get(task.assigneeId) : null;
        return {
          ...task,
          projectId: task.projectId,
          workgroupId: project.workgroupId,
          projectName: project.name,
          workgroupName: workgroup?.name || "Unknown",
          assignee: assignee ? {
            _id: assignee._id,
            name: assignee.name,
            email: assignee.email,
            imageUrl: assignee.image,
          } : null,
        };
      })
    )).filter((t) => t !== null);

    // Fetch workgroups for the dashboard
    const workgroups = (
      await Promise.all(workgroupIds.map((id) => ctx.db.get(id)))
    ).filter((w) => w !== null);

    // Fetch projects for the dashboard
    const projects = userProjects;

    return {
      stats: {
        totalWorkspaces: workgroups.length,
        totalProjects: projects.length,
        totalTasks: myTasksFiltered.length,
        overdueTasks: overdueTasksWithDetails.length,
        myTasks: myTasksFiltered.length,
        myOverdueTasks: myOverdueTasks.length,
      },
      tasksByStatus,
      recentActivity: filteredActivity,
      upcomingTasks: upcomingTasksWithDetails,
      overdueTasksList: overdueTasksWithDetails,
      onTimeTasks: onTimeTasksWithDetails,
      myTasksList: allMyTasksWithDetails,
      myExternalTasksList: myExternalTasksWithDetails,
      allAccessibleTasks: allAccessibleTasksWithDetails,
      workgroups,
      projects,
    };
  },
});

/**
 * One-time migration to normalize all task statuses and kanban column statuses
 */
export const normalizeAllTaskStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Function to normalize status strings
    const normalizeStatus = (status: string): string => {
      const normalized = status.toLowerCase().replace(/\s+/g, '_');
      // Map common variations to standard statuses
      if (normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'in-progress') {
        return 'in_progress';
      }
      if (normalized === 'todo' || normalized === 'to_do' || normalized === 'to-do') {
        return 'todo';
      }
      if (normalized === 'done' || normalized === 'complete' || normalized === 'completed') {
        return 'done';
      }
      if (normalized === 'review' || normalized === 'in_review' || normalized === 'in-review') {
        return 'review';
      }
      if (normalized === 'blocked' || normalized === 'block') {
        return 'blocked';
      }
      return normalized;
    };

    // Get all tasks
    const allTasks = await ctx.db.query("tasks").collect();
    
    let updatedTasksCount = 0;
    const taskUpdates: Array<{ taskId: string; oldStatus: string; newStatus: string }> = [];

    for (const task of allTasks) {
      const normalizedStatus = normalizeStatus(task.status);
      
      if (task.status !== normalizedStatus) {
        taskUpdates.push({
          taskId: task._id,
          oldStatus: task.status,
          newStatus: normalizedStatus,
        });
        
        await ctx.db.patch(task._id, {
          status: normalizedStatus,
        });
        
        updatedTasksCount++;
      }
    }

    // Also normalize Kanban column statuses
    const allKanbanColumns = await ctx.db.query("kanban_columns").collect();
    let updatedColumnsCount = 0;
    const columnUpdates: Array<{ columnId: string; oldStatusKey: string; newStatusKey: string }> = [];

    for (const column of allKanbanColumns) {
      const normalizedStatusKey = normalizeStatus(column.statusKey);
      
      if (column.statusKey !== normalizedStatusKey) {
        columnUpdates.push({
          columnId: column._id,
          oldStatusKey: column.statusKey,
          newStatusKey: normalizedStatusKey,
        });
        
        await ctx.db.patch(column._id, {
          statusKey: normalizedStatusKey,
        });
        
        updatedColumnsCount++;
      }
    }

    console.log(`[Status Normalization] Updated ${updatedTasksCount} tasks and ${updatedColumnsCount} kanban columns`);

    return {
      success: true,
      totalTasks: allTasks.length,
      updatedTasksCount,
      totalColumns: allKanbanColumns.length,
      updatedColumnsCount,
      taskUpdates,
      columnUpdates,
    };
  },
});
