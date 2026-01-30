import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tags")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tags", {
      projectId: args.projectId,
      name: args.name,
      color: args.color,
    });
  },
});

export const getTaskTags = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const taskTags = await ctx.db
      .query("task_tags")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return await Promise.all(
      taskTags.map(async (tt) => {
        const tag = await ctx.db.get(tt.tagId);
        return tag ? { ...tag, taskTagId: tt._id } : null;
      })
    ).then(tags => tags.filter(t => t !== null));
  },
});

export const getProjectTaskTags = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Get all tasks for this project
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const taskIds = tasks.map(t => t._id);

    // Get all task_tags for these tasks
    const allTaskTags = await ctx.db
      .query("task_tags")
      .collect();

    // Filter to only include task_tags for this project's tasks
    return allTaskTags.filter(tt => taskIds.includes(tt.taskId));
  },
});

export const addTagToTask = mutation({
  args: {
    taskId: v.id("tasks"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    // Check if the association already exists
    const existing = await ctx.db
      .query("task_tags")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const alreadyExists = existing.some(tt => tt.tagId === args.tagId);
    
    if (!alreadyExists) {
      await ctx.db.insert("task_tags", {
        taskId: args.taskId,
        tagId: args.tagId,
      });
    }
  },
});

export const removeTagFromTask = mutation({
  args: {
    taskTagId: v.id("task_tags"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskTagId);
  },
});

export const deleteTag = mutation({
  args: { tagId: v.id("tags") },
  handler: async (ctx, args) => {
    // Delete all task_tag associations
    const taskTags = await ctx.db
      .query("task_tags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();

    for (const tt of taskTags) {
      await ctx.db.delete(tt._id);
    }

    // Delete the tag itself
    await ctx.db.delete(args.tagId);
  },
});