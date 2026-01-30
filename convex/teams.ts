import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { checkUserPermission, SYSTEM_AREAS } from "./permissionHelpers";
import { ROLES, roleValidator } from "./schema";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    memberIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check if user has permission to create teams
    const canCreate = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.TEAMS,
      "create"
    );

    if (!canCreate) {
      throw new Error("You don't have permission to create teams");
    }

    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      description: args.description,
      createdBy: user._id,
    });

    // Add creator as a member (owner)
    await ctx.db.insert("team_members", {
      teamId,
      userId: user._id,
      role: ROLES.OWNER,
    });

    // Add additional members if provided
    if (args.memberIds) {
      for (const memberId of args.memberIds) {
        const existing = await ctx.db
          .query("team_members")
          .withIndex("by_team_and_user", (q) =>
            q.eq("teamId", teamId).eq("userId", memberId)
          )
          .first();

        if (!existing) {
          await ctx.db.insert("team_members", {
            teamId,
            userId: memberId,
            role: ROLES.COLLABORATOR,
          });
        }
      }
    }

    return teamId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Check if user has permission to view teams
    const canView = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.TEAMS,
      "view"
    );

    if (!canView) {
      return [];
    }

    const teams = await ctx.db.query("teams").collect();

    return await Promise.all(
      teams.map(async (team) => {
        const creator = await ctx.db.get(team.createdBy);
        const members = await ctx.db
          .query("team_members")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();

        const memberDetails = await Promise.all(
          members.map(async (m) => {
            const memberUser = await ctx.db.get(m.userId);
            let imageUrl: string | undefined = memberUser?.image ?? undefined;

            if (memberUser?.imageId) {
              const url = await ctx.storage.getUrl(memberUser.imageId);
              if (url) {
                imageUrl = url;
              }
            }

            return {
              _id: m.userId,
              name: memberUser?.name || "Unknown",
              email: memberUser?.email || "",
              role: m.role || ROLES.COLLABORATOR,
              imageUrl,
            };
          })
        );

        return {
          ...team,
          creatorName: creator?.name || "Unknown",
          memberCount: members.length,
          members: memberDetails,
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check if user has permission to view teams
    const canView = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.TEAMS,
      "view"
    );

    if (!canView) {
      throw new Error("You don't have permission to view teams");
    }

    const team = await ctx.db.get(args.id);
    if (!team) return null;

    const creator = await ctx.db.get(team.createdBy);
    const members = await ctx.db
      .query("team_members")
      .withIndex("by_team", (q) => q.eq("teamId", args.id))
      .collect();

    const memberDetails = await Promise.all(
      members.map(async (m) => {
        const memberUser = await ctx.db.get(m.userId);
        let imageUrl: string | undefined = memberUser?.image ?? undefined;

        if (memberUser?.imageId) {
          const url = await ctx.storage.getUrl(memberUser.imageId);
          if (url) {
            imageUrl = url;
          }
        }

        return {
          _id: m.userId,
          name: memberUser?.name || "Unknown",
          email: memberUser?.email || "",
          role: m.role || ROLES.COLLABORATOR,
          imageUrl,
        };
      })
    );

    return {
      ...team,
      creatorName: creator?.name || "Unknown",
      members: memberDetails,
    };
  },
});

export const getTeamMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("team_members")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const users = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return user;
      })
    );

    // Filter out nulls and blocked users
    return users.filter((u) => u !== null && !u.isBlocked);
  },
});

export const update = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const team = await ctx.db.get(args.id);
    if (!team) throw new Error("Team not found");

    // Check if user has permission to edit teams
    const canEdit = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.TEAMS,
      "edit"
    );

    if (!canEdit) {
      throw new Error("You don't have permission to edit teams");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const addMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.optional(roleValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("team_members")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .first();

    if (existing) throw new Error("User is already a member of this team");

    await ctx.db.insert("team_members", {
      teamId: args.teamId,
      userId: args.userId,
      role: args.role || ROLES.COLLABORATOR,
    });
  },
});

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("team_members")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .first();

    if (!membership) throw new Error("User is not a member of this team");

    await ctx.db.delete(membership._id);
  },
});

export const deleteTeam = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const team = await ctx.db.get(args.id);
    if (!team) throw new Error("Team not found");

    // Check if user has permission to delete teams
    const canDelete = await checkUserPermission(
      ctx,
      user._id,
      SYSTEM_AREAS.TEAMS,
      "delete"
    );

    if (!canDelete) {
      throw new Error("You don't have permission to delete teams");
    }

    // Even with delete permission, users can only delete teams they created
    if (team.createdBy !== user._id) {
      throw new Error("Você não pode deletar times criados por outros usuários");
    }

    // Delete all team members
    const members = await ctx.db
      .query("team_members")
      .withIndex("by_team", (q) => q.eq("teamId", args.id))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete the team
    await ctx.db.delete(args.id);
  },
});