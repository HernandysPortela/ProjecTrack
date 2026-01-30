import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    return await ctx.storage.generateUploadUrl();
  },
});

export const createAttachment = mutation({
  args: {
    taskId: v.id("tasks"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const attachmentId = await ctx.db.insert("attachments", {
      taskId: args.taskId,
      provider: "convex",
      fileName: args.fileName,
      fileUrl: args.storageId,
      size: args.fileSize,
      uploadedBy: userId,
    });

    return attachmentId;
  },
});

export const list = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const url = await ctx.storage.getUrl(attachment.fileUrl as any);
        const uploader = await ctx.db.get(attachment.uploadedBy);
        
        return {
          ...attachment,
          url,
          uploaderName: uploader?.name || "Unknown",
        };
      })
    );

    return attachmentsWithUrls;
  },
});

export const deleteAttachment = mutation({
  args: { id: v.id("attachments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const attachment = await ctx.db.get(args.id);
    if (!attachment) throw new Error("Attachment not found");

    // Delete from storage
    await ctx.storage.delete(attachment.fileUrl as any);
    
    // Delete from database
    await ctx.db.delete(args.id);
  },
});
