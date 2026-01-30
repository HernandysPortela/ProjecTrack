import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("checklist_items")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return items.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existingItems = await ctx.db
      .query("checklist_items")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const maxOrder = existingItems.length > 0 
      ? Math.max(...existingItems.map(i => i.order))
      : -1;

    return await ctx.db.insert("checklist_items", {
      taskId: args.taskId,
      text: args.text,
      completed: false,
      order: maxOrder + 1,
    });
  },
});

export const toggle = mutation({
  args: {
    id: v.id("checklist_items"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, { completed: args.completed });
  },
});

export const deleteItem = mutation({
  args: { id: v.id("checklist_items") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("checklist_items"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, { text: args.text });
  },
});

export const reorder = mutation({
  args: {
    id: v.id("checklist_items"),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Checklist item not found");

    const oldOrder = item.order;
    const newOrder = args.newOrder;

    // Get all items for the same task
    const allItems = await ctx.db
      .query("checklist_items")
      .withIndex("by_task", (q) => q.eq("taskId", item.taskId))
      .collect();

    // Update the moved item
    await ctx.db.patch(args.id, { order: newOrder });

    // Shift other items
    if (newOrder < oldOrder) {
      // Moving up: shift items down
      for (const otherItem of allItems) {
        if (otherItem._id !== args.id && otherItem.order >= newOrder && otherItem.order < oldOrder) {
          await ctx.db.patch(otherItem._id, { order: otherItem.order + 1 });
        }
      }
    } else if (newOrder > oldOrder) {
      // Moving down: shift items up
      for (const otherItem of allItems) {
        if (otherItem._id !== args.id && otherItem.order > oldOrder && otherItem.order <= newOrder) {
          await ctx.db.patch(otherItem._id, { order: otherItem.order - 1 });
        }
      }
    }
  },
});
