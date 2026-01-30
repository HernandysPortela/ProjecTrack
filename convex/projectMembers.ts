import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";
import { Role } from "./schema";

// Get users that can be assigned to tasks in a project
export const getAssignableUsers = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) return []; // Return empty array instead of throwing error

    // Get all project members
    const members = await ctx.db
      .query("project_members")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Get user details for all members
    const assignableUsers = await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);
        if (!memberUser) return null;
        return {
          _id: memberUser._id,
          name: memberUser.name || "Unknown",
          email: memberUser.email || "",
          role: member.role,
        };
      })
    );

    // Filter out null values
    const validUsers = assignableUsers.filter((u) => u !== null);
    
    // Add owner if not already in the list
    if (project.ownerId) {
      const owner = await ctx.db.get(project.ownerId);
      if (owner && !validUsers.find((u) => u._id === owner._id)) {
        validUsers.push({
          _id: owner._id,
          name: owner.name || "Unknown",
          email: owner.email || "",
          role: "owner" as Role,
        });
      }
    }

    // Add manager if not already in the list
    if (project.managerId) {
      const manager = await ctx.db.get(project.managerId);
      if (manager && !validUsers.find((u) => u._id === manager._id)) {
        validUsers.push({
          _id: manager._id,
          name: manager.name || "Unknown",
          email: manager.email || "",
          role: "manager" as Role,
        });
      }
    }

    // Add members from allowed teams
    if (project.allowedTeamIds) {
      for (const teamId of project.allowedTeamIds) {
        const teamMembers = await ctx.db
          .query("team_members")
          .withIndex("by_team", (q) => q.eq("teamId", teamId))
          .collect();

        for (const member of teamMembers) {
          const user = await ctx.db.get(member.userId);
          if (user && !validUsers.find((u) => u._id === user._id)) {
            validUsers.push({
              _id: user._id,
              name: user.name || "Unknown",
              email: user.email || "",
              role: member.role as Role,
            });
          }
        }
      }
    }

    return validUsers;
  },
});

// List all members of a project
export const listMembers = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    // Get all project members from project_members table
    const members = await ctx.db
      .query("project_members")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const membersWithInfo = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
              }
            : null,
        };
      })
    );

    // Add project owner if not already in the list
    if (project.ownerId) {
      const owner = await ctx.db.get(project.ownerId);
      if (owner && !membersWithInfo.find((m) => m.userId === owner._id)) {
        membersWithInfo.push({
          projectId: args.projectId,
          userId: owner._id,
          role: "owner" as Role,
          _id: `owner_${owner._id}` as any,
          _creationTime: project._creationTime,
          user: {
            _id: owner._id,
            name: owner.name,
            email: owner.email,
            image: owner.image,
          },
        });
      }
    }

    // Add project manager if not already in the list
    if (project.managerId) {
      const manager = await ctx.db.get(project.managerId);
      if (manager && !membersWithInfo.find((m) => m.userId === manager._id)) {
        membersWithInfo.push({
          projectId: args.projectId,
          userId: manager._id,
          role: "manager" as Role,
          _id: `manager_${manager._id}` as any,
          _creationTime: project._creationTime,
          user: {
            _id: manager._id,
            name: manager.name,
            email: manager.email,
            image: manager.image,
          },
        });
      }
    }

    return membersWithInfo;
  },
});