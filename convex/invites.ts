import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { ROLES } from "./schema";
import { checkUserPermission, SYSTEM_AREAS } from "./permissionHelpers";

export const create = mutation({
  args: {
    workgroupId: v.id("workgroups"),
    email: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    // Check if user has permission to create invites
    const canCreate = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.SYSTEM_USERS,
      "create"
    );

    if (!canCreate) {
      throw new Error("You don't have permission to invite users");
    }

    // Check if user is already a member
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const existingMembership = await ctx.db
        .query("workgroup_members")
        .withIndex("by_workgroup_and_user", (q) =>
          q.eq("workgroupId", args.workgroupId).eq("userId", existingUser._id)
        )
        .first();

      if (existingMembership) {
        throw new Error("User is already a member of this workspace");
      }
    }

    // Check if invite already exists
    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => 
        q.and(
          q.eq(q.field("workgroupId"), args.workgroupId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvite) {
      throw new Error("An invite has already been sent to this email");
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const inviteId = await ctx.db.insert("invites", {
      email: args.email,
      name: args.name,
      invitedBy: user._id,
      workgroupId: args.workgroupId,
      token,
      status: "pending",
      role: args.role as any,
    });

    // Get workgroup name for email
    const workgroup = await ctx.db.get(args.workgroupId);
    const workgroupName = workgroup?.name || "Workspace";

    // Send invite email with correct link format
    await ctx.scheduler.runAfter(0, internal.emailService.sendInviteEmail, {
      email: args.email,
      name: args.name,
      inviterName: user.name || "Someone",
      inviteLink: `${process.env.CONVEX_SITE_URL}/invite?token=${token}`,
    });

    return inviteId;
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) return null;

    const workgroup = await ctx.db.get(invite.workgroupId);
    const inviter = await ctx.db.get(invite.invitedBy);

    return {
      ...invite,
      workgroupName: workgroup?.name || "Unknown Workspace",
      inviterName: inviter?.name || "Unknown User",
    };
  },
});

export const list = query({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!membership) return [];

    // Check permissions
    const canView = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.SYSTEM_USERS,
      "view"
    );

    if (!canView) return [];

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();

    return invites.filter(i => i.status === "pending");
  },
});

export const cancel = mutation({
  args: { id: v.id("invites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const invite = await ctx.db.get(args.id);
    if (!invite) throw new Error("Invite not found");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", invite.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!membership) throw new Error("Not a member of this workspace");

    // Check permissions
    const canDelete = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.SYSTEM_USERS,
      "delete"
    );

    if (!canDelete) throw new Error("You don't have permission to cancel invites");

    await ctx.db.patch(args.id, { status: "cancelled" });
  },
});

export const accept = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) throw new Error("Invalid invite token");
    if (invite.status !== "pending") throw new Error("Invite is no longer valid");

    // Update invite status
    await ctx.db.patch(invite._id, { status: "accepted" });

    // Add user to workgroup
    const existingMembership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", invite.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!existingMembership) {
      await ctx.db.insert("workgroup_members", {
        workgroupId: invite.workgroupId,
        userId: user._id,
        role: invite.role,
      });
    }

    return invite.workgroupId;
  },
});