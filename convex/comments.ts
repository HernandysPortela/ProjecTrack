import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { internal } from "./_generated/api";

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const commentId = await ctx.db.insert("comments", {
      taskId: args.taskId,
      userId: user._id,
      body: args.body,
    });

    // Get task info to send notification
    const task = await ctx.db.get(args.taskId);
    if (task && task.assigneeId && task.assigneeId !== user._id) {
      // Notify the assignee about the new comment (only if they're not the commenter)
      await ctx.scheduler.runAfter(
        0,
        internal.notificationTriggers.triggerTaskNotification,
        {
          event: "comment_added",
          taskId: args.taskId,
          taskTitle: task.title,
          projectId: task.projectId,
          details: `${user.name || "Alguém"} adicionou um comentário: "${args.body.substring(0, 100)}${args.body.length > 100 ? '...' : ''}"`,
          assigneeId: task.assigneeId,
          actorId: user._id,
        }
      );
    }

    return commentId;
  },
});

export const list = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return await Promise.all(
      comments.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        return {
          ...c,
          userName: user?.name || "Unknown",
          userImage: user?.image,
        };
      })
    );
  },
});

export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Only allow the comment author to delete their own comment
    if (comment.userId !== user._id) {
      throw new Error("You can only delete your own comments");
    }

    await ctx.db.delete(args.commentId);
  },
});
