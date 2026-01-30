import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { ROLES, TASK_STATUS } from "./schema";

export const getColumns = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const customColumns = await ctx.db
      .query("kanban_columns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Define default columns
    const defaultColumns = [
      { statusKey: TASK_STATUS.TODO, name: "To Do", order: 0, color: "#94a3b8" },
      { statusKey: TASK_STATUS.IN_PROGRESS, name: "In Progress", order: 1, color: "#3b82f6" },
      { statusKey: TASK_STATUS.REVIEW, name: "Review", order: 2, color: "#f59e0b" },
      { statusKey: TASK_STATUS.DONE, name: "Done", order: 3, color: "#10b981" },
      { statusKey: TASK_STATUS.BLOCKED, name: "Blocked", order: 4, color: "#ef4444" },
    ];

    if (customColumns.length === 0) {
      // Return default columns if no custom columns exist
      return defaultColumns;
    }

    // Get status keys that have been customized
    const customizedStatusKeys = new Set(customColumns.map(col => col.statusKey));

    // Filter out default columns that have been customized
    const remainingDefaults = defaultColumns.filter(
      def => !customizedStatusKeys.has(def.statusKey)
    );

    // Combine custom columns with remaining defaults and sort by order
    const allColumns = [...customColumns, ...remainingDefaults];
    return allColumns.sort((a, b) => a.order - b.order);
  },
});

export const reorderColumns = mutation({
  args: {
    projectId: v.id("projects"),
    columnId: v.string(),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.role === ROLES.READER) {
      throw new Error("Insufficient permissions");
    }

    // Get all custom columns for this project
    const customColumns = await ctx.db
      .query("kanban_columns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Get all columns (custom + defaults) using the same logic as getColumns
    const defaultColumns = [
      { statusKey: TASK_STATUS.TODO, name: "To Do", order: 0, color: "#94a3b8" },
      { statusKey: TASK_STATUS.IN_PROGRESS, name: "In Progress", order: 1, color: "#3b82f6" },
      { statusKey: TASK_STATUS.REVIEW, name: "Review", order: 2, color: "#f59e0b" },
      { statusKey: TASK_STATUS.DONE, name: "Done", order: 3, color: "#10b981" },
      { statusKey: TASK_STATUS.BLOCKED, name: "Blocked", order: 4, color: "#ef4444" },
    ];

    const customizedStatusKeys = new Set(customColumns.map(col => col.statusKey));
    const remainingDefaults = defaultColumns.filter(
      def => !customizedStatusKeys.has(def.statusKey)
    );

    const allColumns = [...customColumns, ...remainingDefaults].sort((a, b) => a.order - b.order);

    // Find the column being moved
    const movingColumnIndex = allColumns.findIndex(col => 
      ('_id' in col ? col._id : col.statusKey) === args.columnId
    );

    if (movingColumnIndex === -1) {
      throw new Error("Column not found");
    }

    const movingColumn = allColumns[movingColumnIndex];
    const oldOrder = movingColumn.order;
    const newOrder = args.newOrder;

    // If it's a default column being moved, we need to convert it to a custom column first
    if (!('_id' in movingColumn)) {
      // Create a custom column for this default
      const newColumnId = await ctx.db.insert("kanban_columns", {
        projectId: args.projectId,
        name: movingColumn.name,
        statusKey: movingColumn.statusKey,
        order: newOrder,
        color: movingColumn.color || "#6b7280",
      });
      
      // Update orders for other custom columns
      for (const col of customColumns) {
        if (oldOrder < newOrder && col.order > oldOrder && col.order <= newOrder) {
          await ctx.db.patch(col._id, { order: col.order - 1 });
        } else if (oldOrder > newOrder && col.order >= newOrder && col.order < oldOrder) {
          await ctx.db.patch(col._id, { order: col.order + 1 });
        }
      }
    } else {
      // Update the moving column's order
      await ctx.db.patch(movingColumn._id, { order: newOrder });

      // Update orders for affected custom columns
      for (const col of customColumns) {
        if (col._id === movingColumn._id) continue;
        
        if (oldOrder < newOrder && col.order > oldOrder && col.order <= newOrder) {
          await ctx.db.patch(col._id, { order: col.order - 1 });
        } else if (oldOrder > newOrder && col.order >= newOrder && col.order < oldOrder) {
          await ctx.db.patch(col._id, { order: col.order + 1 });
        }
      }
    }
  },
});

export const createColumn = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    color: v.optional(v.string()),
    statusKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.role === ROLES.READER) {
      throw new Error("Insufficient permissions");
    }

    const existingColumns = await ctx.db
      .query("kanban_columns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Calculate max order considering both custom columns and default columns (5 defaults)
    const defaultColumnCount = 5;
    const maxOrder = existingColumns.length > 0 
      ? Math.max(...existingColumns.map(c => c.order))
      : defaultColumnCount - 1;

    const statusKey = args.statusKey || args.name.toLowerCase().replace(/\s+/g, "_");

    return await ctx.db.insert("kanban_columns", {
      projectId: args.projectId,
      name: args.name,
      statusKey,
      order: maxOrder + 1,
      color: args.color || "#6b7280",
    });
  },
});

export const updateColumn = mutation({
  args: {
    id: v.id("kanban_columns"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const column = await ctx.db.get(args.id);
    if (!column) throw new Error("Column not found");

    const project = await ctx.db.get(column.projectId);
    if (!project) throw new Error("Project not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.role === ROLES.READER) {
      throw new Error("Insufficient permissions");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    // Note: Tasks already use statusKey, so renaming a column doesn't break task associations
    // The statusKey remains constant even when the column name changes
  },
});

export const deleteColumn = mutation({
  args: { 
    id: v.id("kanban_columns"),
    moveTasksToStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const column = await ctx.db.get(args.id);
    if (!column) throw new Error("Column not found");

    const project = await ctx.db.get(column.projectId);
    if (!project) throw new Error("Project not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", project.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.role === ROLES.READER) {
      throw new Error("Insufficient permissions");
    }

    // Move tasks to another status if specified
    if (args.moveTasksToStatus) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", column.projectId))
        .collect();

      for (const task of tasks) {
        if (task.status === column.statusKey) {
          await ctx.db.patch(task._id, { status: args.moveTasksToStatus });
        }
      }
    }

    await ctx.db.delete(args.id);
  },
});