import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { ROLES } from "./schema";

/**
 * Temporary utility to fix user roles
 * This should be run manually to assign owner role to specific users
 */
export const setUserRoleByEmail = mutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal(ROLES.OWNER),
      v.literal(ROLES.MANAGER),
      v.literal(ROLES.COLLABORATOR),
      v.literal(ROLES.READER)
    ),
  },
  handler: async (ctx, args) => {
    // Find ALL users with this email
    const users = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    if (users.length === 0) {
      throw new Error(`No users found with email ${args.email}`);
    }

    // Update all users with this email
    const updatedUserIds = [];
    for (const user of users) {
      await ctx.db.patch(user._id, {
        role: args.role,
      });
      updatedUserIds.push(user._id);
    }

    return { 
      success: true, 
      updatedCount: users.length,
      userIds: updatedUserIds, 
      newRole: args.role 
    };
  },
});