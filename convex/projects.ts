import { v } from "convex/values";
import { mutation, query, internalMutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create a new project
export const create = mutation({
  args: {
    workgroupId: v.id("workgroups"),
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    color: v.string(),
    status: v.optional(
      v.union(
        v.literal("in_progress"),
        v.literal("paused"),
        v.literal("finished")
      )
    ),
    teamRestricted: v.optional(v.boolean()),
    allowedTeamIds: v.optional(v.array(v.id("teams"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    let user = await ctx.db.get(userId);
    
    if (!user) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("User identity not found");
      }
      
      const normalizedEmail = identity.email?.toLowerCase() ?? "";
      
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .unique();
      
      if (!user) {
        throw new Error(`User not found. Please ensure you are logged in correctly.`);
      }
    }

    const workgroup = await ctx.db.get(args.workgroupId);
    if (!workgroup) throw new Error("Workgroup not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", user._id)
      )
      .unique();

    const isWorkgroupOwner = workgroup.ownerId === user._id;
    const hasManagerPrivileges =
      (membership &&
        (membership.role === "owner" || membership.role === "manager")) ||
      isWorkgroupOwner;

    if (!hasManagerPrivileges) {
      throw new Error("Insufficient permissions to create projects");
    }

    const projectId = await ctx.db.insert("projects", {
      workgroupId: args.workgroupId,
      ownerId: user._id,
      name: args.name,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      color: args.color,
      status: args.status || "in_progress",
      teamRestricted: args.teamRestricted,
      allowedTeamIds: args.allowedTeamIds,
    });

    await ctx.db.insert("project_members", {
      projectId,
      userId: user._id,
      role: "owner",
    });

    return projectId;
  },
});

// List projects in a workgroup
export const list = query({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workgroup", (q) =>
        q.eq("workgroupId", args.workgroupId)
      )
      .take(200);

    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        const owner = project.ownerId ? await ctx.db.get(project.ownerId) : null;
        const taskCount = await ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        return {
          ...project,
          ownerName: owner?.name || "Unknown",
          taskCount: taskCount.length,
        };
      })
    );

    return projectsWithDetails;
  },
});

// Get a single project
export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(args.id);
    if (!project) return null;

    const owner = project.ownerId ? await ctx.db.get(project.ownerId) : null;
    return {
      ...project,
      ownerName: owner?.name || "Unknown",
    };
  },
});

// Update project status
export const updateStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership || !["owner", "manager", "collaborator"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.patch(args.projectId, {
      status: args.status,
    });

    return { success: true };
  },
});

// Update a project
export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    color: v.optional(v.string()),
    status: v.optional(v.union(v.literal("in_progress"), v.literal("paused"), v.literal("finished"))),
    teamRestricted: v.optional(v.boolean()),
    allowedTeamIds: v.optional(v.array(v.id("teams"))),
    managerId: v.optional(v.id("users")),
    startQuarter: v.optional(v.string()),
    startYear: v.optional(v.number()),
    approvalStatus: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("blocked"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const { id, managerId, ...updates } = args;
    
    const project = await ctx.db.get(id);
    if (!project) throw new Error("Project not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Not a member of this workgroup");

    const isProjectOwner = project.ownerId === user._id;
    const isWorkgroupAdmin = membership.role === "owner" || membership.role === "manager";

    if (!isProjectOwner && !isWorkgroupAdmin) {
      throw new Error("Insufficient permissions to update project");
    }
    
    await ctx.db.patch(id, updates);
  },
});

// Update project priority
export const updatePriority = mutation({
  args: {
    id: v.id("projects"),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Not a member of this workgroup");

    await ctx.db.patch(args.id, { priority: args.priority });
  },
});

// Update project dates based on tasks (internal mutation - called automatically)
export const updateProjectDatesFromTasks = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return; // Silently return if project not found

    // Get all tasks for this project
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    if (tasks.length === 0) {
      // No tasks, clear dates
      await ctx.db.patch(args.projectId, {
        startDate: undefined,
        endDate: undefined,
      });
      return;
    }

    // Get all start dates and due dates from tasks
    const startDates = tasks
      .map(t => t.startDate)
      .filter((d): d is number => d !== undefined && d !== null);

    const dueDates = tasks
      .map(t => t.dueDate)
      .filter((d): d is number => d !== undefined && d !== null);

    // Calculate earliest start date and latest due date
    const earliestStart = startDates.length > 0 ? Math.min(...startDates) : undefined;
    const latestEnd = dueDates.length > 0 ? Math.max(...dueDates) : undefined;

    // Update project with calculated dates
    await ctx.db.patch(args.projectId, {
      startDate: earliestStart,
      endDate: latestEnd,
    });
  },
});

// Public mutation to manually recalculate project dates
export const recalculateProjectDates = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Not a member of this workgroup");

    // Get all tasks for this project
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    if (tasks.length === 0) {
      // No tasks, clear dates
      await ctx.db.patch(args.projectId, {
        startDate: undefined,
        endDate: undefined,
      });
      return;
    }

    // Get all start dates and due dates from tasks
    const startDates = tasks
      .map(t => t.startDate)
      .filter((d): d is number => d !== undefined && d !== null);

    const dueDates = tasks
      .map(t => t.dueDate)
      .filter((d): d is number => d !== undefined && d !== null);

    // Calculate earliest start date and latest due date (DISTINCT logic)
    const earliestStart = startDates.length > 0 ? Math.min(...startDates) : undefined;
    const latestEnd = dueDates.length > 0 ? Math.max(...dueDates) : undefined;

    // Update project with calculated dates
    await ctx.db.patch(args.projectId, {
      startDate: earliestStart,
      endDate: latestEnd,
    });
  },
});

// Remove a project
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    if (project.ownerId !== user._id) {
       const membership = await ctx.db
        .query("workgroup_members")
        .withIndex("by_workgroup_and_user", (q) =>
          q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
        )
        .unique();
        
       if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
         throw new Error("Insufficient permissions to delete project");
       }
    }

    // Delete all tasks in the project (CASCADE DELETE)
    console.log(`🗑️ Deleting project "${project.name}" and all related data...`);
    
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    console.log(`  📋 Found ${tasks.length} tasks to delete`);

    for (const task of tasks) {
      // Delete task dependencies (taskDependencies table)
      const taskDependencies = await ctx.db
        .query("taskDependencies")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const dep of taskDependencies) {
        await ctx.db.delete(dep._id);
      }

      const blockingDependencies = await ctx.db
        .query("taskDependencies")
        .withIndex("by_depends_on", (q) => q.eq("dependsOnTaskId", task._id))
        .collect();
      for (const dep of blockingDependencies) {
        await ctx.db.delete(dep._id);
      }

      // Delete task permissions
      const taskPermissions = await ctx.db
        .query("task_permissions")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const permission of taskPermissions) {
        await ctx.db.delete(permission._id);
      }

      // Delete task attachments
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const attachment of attachments) {
        await ctx.db.delete(attachment._id);
      }

      // Delete task comments
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }

      // Delete task tags (task_tags junction table)
      const taskTags = await ctx.db
        .query("task_tags")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const tag of taskTags) {
        await ctx.db.delete(tag._id);
      }

      // Delete task checklists
      const checklists = await ctx.db
        .query("checklist_items")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const item of checklists) {
        await ctx.db.delete(item._id);
      }

      // Delete the task itself
      await ctx.db.delete(task._id);
    }

    // Delete project-level kanban columns
    const kanbanColumns = await ctx.db
      .query("kanban_columns")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const column of kanbanColumns) {
      await ctx.db.delete(column._id);
    }

    // Delete project tags (the tags themselves, not task_tags)
    const projectTags = await ctx.db
      .query("tags")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const tag of projectTags) {
      await ctx.db.delete(tag._id);
    }

    // Delete project members
    const members = await ctx.db
      .query("project_members")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    console.log(`  ✅ All related data deleted successfully`);

    // Finally, delete the project itself
    await ctx.db.delete(args.id);
    
    console.log(`🎉 Project "${project.name}" deleted successfully`);
  },
});

export const listAllDebug = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});

// List all projects for current user (only projects where user is owner)
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    // Get only projects where the user is the owner using index
    const userProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    return userProjects;
  },
});

// Get manager history for a project
export const managerHistory = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    // Check if user has access to this project
    const user = await ctx.db.get(userId);
    if (!user) return [];

    const membership = await ctx.db
      .query("project_members")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", user._id)
      )
      .first();

    if (!membership && project.ownerId !== user._id) {
      return [];
    }

    // Return empty array for now - manager history tracking would need to be implemented
    // This would require a separate table to track manager changes over time
    return [];
  },
});
