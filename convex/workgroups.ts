import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { ROLES } from "./schema";
import { checkUserPermission, requirePermission, SYSTEM_AREAS } from "./permissionHelpers";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check if user has permission to create workspaces using their global role
    const canCreate = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.WORKSPACES,
      "create"
    );
    if (!canCreate) {
      throw new Error("You don't have permission to create workspaces");
    }

    // Check if user already has a workspace with this name
    const existingWorkgroups = await ctx.db
      .query("workgroups")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const duplicate = existingWorkgroups.find((w) => w.name === args.name);
    if (duplicate) {
      throw new Error("You already have a workspace with this name");
    }

    const workgroupId = await ctx.db.insert("workgroups", {
      name: args.name,
      description: args.description,
      ownerId: user._id,
    });

    await ctx.db.insert("workgroup_members", {
      workgroupId,
      userId: user._id,
      role: ROLES.OWNER,
    });

    return workgroupId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Check if user has permission to view workspaces using their global role
    const canView = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.WORKSPACES,
      "view"
    );
    if (!canView) {
      return [];
    }

    const memberships = await ctx.db
      .query("workgroup_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Deduplicate memberships by workgroupId to prevent duplicate workspaces in the list
    const uniqueWorkgroupIds = new Set<string>();
    const uniqueMemberships = [];
    
    for (const m of memberships) {
      if (!uniqueWorkgroupIds.has(m.workgroupId)) {
        uniqueWorkgroupIds.add(m.workgroupId);
        uniqueMemberships.push(m);
      }
    }

    const workgroups = await Promise.all(
      uniqueMemberships.map(async (m) => {
        const workgroup = await ctx.db.get(m.workgroupId);
        if (!workgroup) return null;
        const owner = await ctx.db.get(workgroup.ownerId);
        return {
          ...workgroup,
          role: m.role,
          ownerName: owner?.name || "Unknown",
        };
      })
    );

    return workgroups.filter((w) => w !== null);
  },
});

export const get = query({
  args: { id: v.id("workgroups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check if user has permission to view workspaces using their global role
    const canView = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.WORKSPACES,
      "view"
    );
    if (!canView) {
      throw new Error("You don't have permission to view workspaces");
    }

    const workgroup = await ctx.db.get(args.id);
    if (!workgroup) return null;

    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.id).eq("userId", user._id)
      )
      .first();

    if (!membership) return null;

    return { ...workgroup, role: membership.role };
  },
});

export const addMember = mutation({
  args: {
    workgroupId: v.id("workgroups"),
    email: v.string(),
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

    if (!membership) throw new Error("Not a member of this workspace");

    // Check permission to edit system users
    await requirePermission(ctx, membership.role, "system_users", "create");

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!targetUser) throw new Error("User not found");

    const existing = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", targetUser._id)
      )
      .first();

    if (existing) throw new Error("User already a member");

    await ctx.db.insert("workgroup_members", {
      workgroupId: args.workgroupId,
      userId: targetUser._id,
      role: args.role as any,
    });

    return targetUser._id;
  },
});

export const addTeamToWorkgroup = mutation({
  args: {
    workgroupId: v.id("workgroups"),
    teamId: v.id("teams"),
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

    if (!membership) throw new Error("Not a member of this workspace");

    // Check permission to edit system users (assuming adding team members falls under this)
    await requirePermission(ctx, membership.role, "system_users", "create");

    const teamMembers = await ctx.db
      .query("team_members")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const results = {
      added: 0,
      alreadyMember: 0,
    };

    for (const member of teamMembers) {
      const existing = await ctx.db
        .query("workgroup_members")
        .withIndex("by_workgroup_and_user", (q) =>
          q.eq("workgroupId", args.workgroupId).eq("userId", member.userId)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("workgroup_members", {
          workgroupId: args.workgroupId,
          userId: member.userId,
          role: args.role as any,
        });
        results.added++;
      } else {
        results.alreadyMember++;
      }
    }

    return results;
  },
});

export const removeMember = mutation({
  args: {
    workgroupId: v.id("workgroups"),
    membershipId: v.id("workgroup_members"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const workgroup = await ctx.db.get(args.workgroupId);
    if (!workgroup) throw new Error("Workgroup not found");

    const requesterMembership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", user._id)
      )
      .first();

    if (!requesterMembership) {
      throw new Error("Not a member of this workspace");
    }

    await requirePermission(ctx, requesterMembership.role, "system_users", "delete");

    const targetMembership = await ctx.db.get(args.membershipId);
    if (!targetMembership) throw new Error("Membership not found");

    if (targetMembership.workgroupId !== args.workgroupId) {
      throw new Error("Membership does not belong to this workspace");
    }

    if (targetMembership.userId === workgroup.ownerId) {
      throw new Error("You cannot remove the workspace owner");
    }

    if (targetMembership.role === ROLES.OWNER) {
      const workgroupMembers = await ctx.db
        .query("workgroup_members")
        .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
        .collect();

      const ownerCount = workgroupMembers.filter((m) => m.role === ROLES.OWNER).length;

      if (ownerCount <= 1) {
        throw new Error("Workspace must keep at least one owner");
      }
    }

    await ctx.db.delete(args.membershipId);
    return { success: true };
  },
});

export const getMembers = query({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const members = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();

    return await Promise.all(
      members.map(async (m) => {
        const memberUser = await ctx.db.get(m.userId);
        return {
          ...m,
          name: memberUser?.name || "Unknown",
          email: memberUser?.email || "",
          image: memberUser?.image,
        };
      })
    );
  },
});

export const listMembers = query({
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

    const members = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();

    return await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);
        return {
          ...member,
          userName: memberUser?.name || memberUser?.email || "Unknown",
          userEmail: memberUser?.email || "",
        };
      })
    );
  },
});

export const deleteWorkgroup = mutation({
  args: { workgroupId: v.id("workgroups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const workgroup = await ctx.db.get(args.workgroupId);
    if (!workgroup) throw new Error("Workgroup not found");

    // Check permission to delete workspaces using global role
    const canDelete = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.WORKSPACES,
      "delete"
    );

    if (!canDelete) {
      throw new Error("You don't have permission to delete workspaces");
    }

    // Only allow deletion if user is the creator OR has owner role
    if (workgroup.ownerId !== user._id && user.role !== "owner") {
      throw new Error("Você não pode deletar workspaces criados por outros usuários");
    }

    // Delete all projects in the workgroup
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();

    for (const project of projects) {
      // Delete all tasks in the project
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();

      for (const task of tasks) {
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

        // Delete task tags
        const tags = await ctx.db
          .query("task_tags")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();
        for (const tag of tags) {
          await ctx.db.delete(tag._id);
        }

        // Delete task events
        const taskEvents = await ctx.db
          .query("events")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();
        for (const event of taskEvents) {
          await ctx.db.delete(event._id);
        }

        // Delete task activity logs
        const taskActivityLogs = await ctx.db
          .query("activity_log")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();
        for (const log of taskActivityLogs) {
          await ctx.db.delete(log._id);
        }

        // Delete the task itself
        await ctx.db.delete(task._id);
      }

      // Delete project events
      const projectEvents = await ctx.db
        .query("events")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const event of projectEvents) {
        await ctx.db.delete(event._id);
      }

      // Delete project activity logs
      const projectActivityLogs = await ctx.db
        .query("activity_log")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const log of projectActivityLogs) {
        await ctx.db.delete(log._id);
      }

      // Delete project
      await ctx.db.delete(project._id);
    }

    // Delete all workgroup members
    const members = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup", (q) => q.eq("workgroupId", args.workgroupId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete the workgroup
    await ctx.db.delete(args.workgroupId);

    return { success: true };
  },
});