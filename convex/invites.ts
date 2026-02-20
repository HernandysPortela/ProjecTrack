import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { ROLES } from "./schema";
import { checkUserPermission, SYSTEM_AREAS } from "./permissionHelpers";

// Invite expiration: 7 days in milliseconds
const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

// Generate a secure random token
function generateSecureToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = "";
    for (let i = 0; i < 8; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join("-");
}

// Role display map for emails
const ROLE_DISPLAY: Record<string, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  collaborator: "Colaborador",
  reader: "Leitor",
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  COLLABORATOR: "Colaborador",
  READER: "Leitor",
};

// Get the frontend app URL
function getAppUrl(): string {
  return process.env.APP_URL || process.env.CONVEX_SITE_URL || "http://localhost:5173";
}

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

    // Normalize email
    const normalizedEmail = args.email.toLowerCase().trim();

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
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
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

    // Check if invite already exists (pending and not expired)
    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .filter((q) => 
        q.and(
          q.eq(q.field("workgroupId"), args.workgroupId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvite) {
      // Check if existing invite is expired
      const now = Date.now();
      if (existingInvite.expiresAt && existingInvite.expiresAt < now) {
        // Mark as expired and allow creating a new one
        await ctx.db.patch(existingInvite._id, { status: "expired" });
      } else {
        throw new Error("An invite has already been sent to this email");
      }
    }

    const token = generateSecureToken();
    const now = Date.now();

    // Get workgroup name for email
    const workgroup = await ctx.db.get(args.workgroupId);
    const workgroupName = workgroup?.name || "Workspace";

    const inviteId = await ctx.db.insert("invites", {
      email: normalizedEmail,
      name: args.name,
      invitedBy: user._id,
      workgroupId: args.workgroupId,
      token,
      status: "pending",
      role: args.role as any,
      expiresAt: now + INVITE_EXPIRATION_MS,
      sentAt: now,
      workgroupName,
    });

    const roleName = ROLE_DISPLAY[args.role] || "Colaborador";
    const appUrl = getAppUrl();

    // Send invite email
    await ctx.scheduler.runAfter(0, internal.emailService.sendInviteEmail, {
      email: normalizedEmail,
      name: args.name,
      inviterName: user.name || "Alguém",
      inviteLink: `${appUrl}/auth?invite=${token}`,
      workgroupName,
      roleName,
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

    // Check if expired
    const now = Date.now();
    if (invite.expiresAt && invite.expiresAt < now && invite.status === "pending") {
      return {
        ...invite,
        status: "expired" as const,
        workgroupName: "Expired",
        inviterName: "Unknown",
        isExpired: true,
      };
    }

    const workgroup = await ctx.db.get(invite.workgroupId);
    const inviter = await ctx.db.get(invite.invitedBy);

    const roleName = ROLE_DISPLAY[invite.role] || "Colaborador";

    return {
      ...invite,
      workgroupName: workgroup?.name || "Unknown Workspace",
      inviterName: inviter?.name || "Unknown User",
      roleName,
      isExpired: false,
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

    const now = Date.now();

    // Enrich invites with inviter name and check expiration
    const enrichedInvites = await Promise.all(
      invites
        .filter(i => i.status === "pending")
        .map(async (invite) => {
          const inviter = await ctx.db.get(invite.invitedBy);
          const isExpired = invite.expiresAt ? invite.expiresAt < now : false;
          const roleName = ROLE_DISPLAY[invite.role] || "Colaborador";
          return {
            ...invite,
            inviterName: inviter?.name || "Unknown",
            isExpired,
            roleName,
          };
        })
    );

    return enrichedInvites;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Check permissions
    const canView = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.SYSTEM_USERS,
      "view"
    );

    if (!canView) return [];

    // Get all workgroups the user is a member of
    const memberships = await ctx.db
      .query("workgroup_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (memberships.length === 0) return [];

    // Collect invites from all workgroups
    const allInvites = [];
    for (const membership of memberships) {
      const invites = await ctx.db
        .query("invites")
        .withIndex("by_workgroup", (q) => q.eq("workgroupId", membership.workgroupId))
        .collect();
      allInvites.push(...invites);
    }

    const now = Date.now();

    // Enrich invites with extra info
    const enrichedInvites = await Promise.all(
      allInvites
        .filter(i => i.status === "pending" || i.status === "accepted" || i.status === "cancelled" || i.status === "expired")
        .map(async (invite) => {
          const inviter = await ctx.db.get(invite.invitedBy);
          const workgroup = await ctx.db.get(invite.workgroupId);
          const isExpired = invite.status === "pending" && invite.expiresAt ? invite.expiresAt < now : false;
          const roleName = ROLE_DISPLAY[invite.role] || "Colaborador";
          return {
            ...invite,
            inviterName: inviter?.name || "Desconhecido",
            workgroupName: workgroup?.name || invite.workgroupName || "Desconhecido",
            isExpired,
            roleName,
          };
        })
    );

    // Sort: pending first, then by creation time descending
    enrichedInvites.sort((a, b) => {
      const statusOrder: Record<string, number> = { pending: 0, accepted: 1, expired: 2, cancelled: 3 };
      const aOrder = statusOrder[a.status] ?? 4;
      const bOrder = statusOrder[b.status] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b._creationTime - a._creationTime;
    });

    return enrichedInvites;
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

export const resend = mutation({
  args: { id: v.id("invites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const invite = await ctx.db.get(args.id);
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") throw new Error("Can only resend pending invites");

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", invite.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!membership) throw new Error("Not a member of this workspace");

    // Check permissions
    const canCreate = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.SYSTEM_USERS,
      "create"
    );

    if (!canCreate) throw new Error("You don't have permission to resend invites");

    // Generate new token and extend expiration
    const newToken = generateSecureToken();
    const now = Date.now();

    await ctx.db.patch(invite._id, {
      token: newToken,
      expiresAt: now + INVITE_EXPIRATION_MS,
      sentAt: now,
    });

    const workgroup = await ctx.db.get(invite.workgroupId);
    const workgroupName = workgroup?.name || "Workspace";
    const roleName = ROLE_DISPLAY[invite.role] || "Colaborador";
    const appUrl = getAppUrl();

    // Resend invite email
    await ctx.scheduler.runAfter(0, internal.emailService.sendInviteEmail, {
      email: invite.email,
      name: invite.name,
      inviterName: user.name || "Alguém",
      inviteLink: `${appUrl}/auth?invite=${newToken}`,
      workgroupName,
      roleName,
    });

    return invite._id;
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

    // Check if invite is expired
    const now = Date.now();
    if (invite.expiresAt && invite.expiresAt < now) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("This invite has expired. Please ask for a new one.");
    }

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