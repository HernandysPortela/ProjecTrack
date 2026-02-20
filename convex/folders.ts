import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create a new folder
export const create = mutation({
  args: {
    workgroupId: v.id("workgroups"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Check if user is a member of the workgroup
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this workgroup");
    }

    // Only owner, manager can create folders
    if (membership.role !== "owner" && membership.role !== "manager") {
      throw new Error("Insufficient permissions to create folder");
    }

    // Get the current max order for this workgroup
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();

    const maxOrder = folders.reduce((max, folder) => {
      return Math.max(max, folder.order || 0);
    }, 0);

    const folderId = await ctx.db.insert("folders", {
      workgroupId: args.workgroupId,
      name: args.name,
      description: args.description,
      color: args.color || "#6b7280",
      order: maxOrder + 1,
      isCollapsed: false,
    });

    return folderId;
  },
});

// Update a folder
export const update = mutation({
  args: {
    id: v.id("folders"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
    isCollapsed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const folder = await ctx.db.get(args.id);
    if (!folder) throw new Error("Folder not found");

    // Check if user is a member of the workgroup
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", folder.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this workgroup");
    }

    // Only owner, manager can update folders
    if (membership.role !== "owner" && membership.role !== "manager") {
      throw new Error("Insufficient permissions to update folder");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// Count projects in a folder
export const countProjects = query({
  args: {
    folderId: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    return projects.length;
  },
});

// Delete a folder
export const remove = mutation({
  args: {
    id: v.id("folders"),
    deleteProjects: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const folder = await ctx.db.get(args.id);
    if (!folder) throw new Error("Folder not found");

    // Check if user is a member of the workgroup
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", folder.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this workgroup");
    }

    // Only owner, manager can delete folders
    if (membership.role !== "owner" && membership.role !== "manager") {
      throw new Error("Insufficient permissions to delete folder");
    }

    // Get all projects in this folder
    const projectsInFolder = await ctx.db
      .query("projects")
      .withIndex("by_folder", (q) => q.eq("folderId", args.id))
      .collect();

    if (args.deleteProjects) {
      // CASCADE DELETE: delete all projects and their related data
      for (const project of projectsInFolder) {
        // Delete all tasks in the project
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        for (const task of tasks) {
          // Delete task dependencies
          const taskDeps = await ctx.db
            .query("taskDependencies")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();
          for (const dep of taskDeps) await ctx.db.delete(dep._id);

          const blockingDeps = await ctx.db
            .query("taskDependencies")
            .withIndex("by_depends_on", (q) => q.eq("dependsOnTaskId", task._id))
            .collect();
          for (const dep of blockingDeps) await ctx.db.delete(dep._id);

          // Delete task permissions
          const taskPerms = await ctx.db
            .query("task_permissions")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();
          for (const perm of taskPerms) await ctx.db.delete(perm._id);

          // Delete attachments
          const attachments = await ctx.db
            .query("attachments")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();
          for (const att of attachments) await ctx.db.delete(att._id);

          // Delete comments
          const comments = await ctx.db
            .query("comments")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();
          for (const comment of comments) await ctx.db.delete(comment._id);

          // Delete task tags
          const taskTags = await ctx.db
            .query("task_tags")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();
          for (const tag of taskTags) await ctx.db.delete(tag._id);

          // Delete checklists
          const checklists = await ctx.db
            .query("checklist_items")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();
          for (const item of checklists) await ctx.db.delete(item._id);

          // Delete task
          await ctx.db.delete(task._id);
        }

        // Delete kanban columns
        const kanbanColumns = await ctx.db
          .query("kanban_columns")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        for (const col of kanbanColumns) await ctx.db.delete(col._id);

        // Delete project tags
        const projectTags = await ctx.db
          .query("tags")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        for (const tag of projectTags) await ctx.db.delete(tag._id);

        // Delete project members
        const projectMembers = await ctx.db
          .query("project_members")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        for (const member of projectMembers) await ctx.db.delete(member._id);

        // Delete the project itself
        await ctx.db.delete(project._id);
      }
    } else {
      // Just move projects to no folder
      for (const project of projectsInFolder) {
        await ctx.db.patch(project._id, { folderId: undefined });
      }
    }

    await ctx.db.delete(args.id);
  },
});

// List all folders for a workgroup
export const list = query({
  args: {
    workgroupId: v.id("workgroups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    // Check if user is a member of the workgroup
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) return [];

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();

    // Sort by order
    return folders.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
});

// Get a single folder
export const get = query({
  args: {
    id: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const folder = await ctx.db.get(args.id);
    if (!folder) return null;

    // Check if user is a member of the workgroup
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", folder.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) return null;

    return folder;
  },
});

// Move project to folder
export const moveProjectToFolder = mutation({
  args: {
    projectId: v.id("projects"),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    // Check if user has permission to edit the project
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this workgroup");
    }

    // Only owner, manager can move projects
    if (membership.role !== "owner" && membership.role !== "manager") {
      throw new Error("Insufficient permissions to move project");
    }

    // If folderId is provided, verify it exists and belongs to the same workgroup
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) throw new Error("Folder not found");
      if (folder.workgroupId !== project.workgroupId) {
        throw new Error("Folder and project must belong to the same workgroup");
      }
    }

    await ctx.db.patch(args.projectId, { folderId: args.folderId });
  },
});

// Reorder folders
export const reorder = mutation({
  args: {
    folderIds: v.array(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Update order for each folder
    for (let i = 0; i < args.folderIds.length; i++) {
      const folderId = args.folderIds[i];
      const folder = await ctx.db.get(folderId);
      
      if (folder) {
        // Check permission
        const membership = await ctx.db
          .query("workgroup_members")
          .withIndex("by_workgroup_and_user", (q) =>
            q.eq("workgroupId", folder.workgroupId).eq("userId", user._id)
          )
          .unique();

        if (membership && (membership.role === "owner" || membership.role === "manager")) {
          await ctx.db.patch(folderId, { order: i + 1 });
        }
      }
    }
  },
});
