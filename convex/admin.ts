import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { ROLES } from "./schema";
import { checkUserPermission, SYSTEM_AREAS } from "./permissionHelpers";

// Get all users in the system (admin function)
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Allow OWNER global role to always view system users (bypass permission check)
    if (currentUser.role !== ROLES.OWNER) {
      // For non-owners, check permissions
      const canView = await checkUserPermission(
        ctx,
        currentUser._id,
        SYSTEM_AREAS.SYSTEM_USERS,
        "view"
      );

      if (!canView) {
        // Return empty list instead of throwing error to prevent UI crash
        // The UI should handle empty list by hiding the section or showing empty state
        return [];
      }
    }

    // Get all users
    const users = await ctx.db.query("users").collect();

    // For each user, get their workgroup memberships
    const usersWithMemberships = await Promise.all(
      users.map(async (user) => {
        // Resolve image URL
        let imageUrl = user.image;
        if (user.imageId) {
          const url = await ctx.storage.getUrl(user.imageId);
          if (url) {
            imageUrl = url;
          }
        }

        const memberships = await ctx.db
          .query("workgroup_members")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        const userWorkgroups = await Promise.all(
          memberships.map(async (m) => {
            const workgroup = await ctx.db.get(m.workgroupId);
            return {
              workgroupId: m.workgroupId,
              workgroupName: workgroup?.name || "Unknown",
              role: m.role,
            };
          })
        );

        return {
          _id: user._id,
          _creationTime: user._creationTime,
          name: user.name,
          email: user.email,
          role: user.role,
          image: imageUrl,
          imageUrl: imageUrl,
          isBlocked: user.isBlocked,
          workgroups: userWorkgroups,
          totalWorkgroups: userWorkgroups.length,
        };
      })
    );

    return usersWithMemberships;
  },
});

// Create a new user
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.optional(v.union(
      v.literal(ROLES.OWNER),
      v.literal(ROLES.MANAGER),
      v.literal(ROLES.COLLABORATOR),
      v.literal(ROLES.READER)
    )),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Allow OWNER global role to always create system users (bypass permission check)
    if (currentUser.role !== ROLES.OWNER) {
      // For non-owners, check permissions
      const canCreate = await checkUserPermission(
        ctx,
        currentUser._id,
        SYSTEM_AREAS.SYSTEM_USERS,
        "create"
      );

      if (!canCreate) {
        throw new Error("You don't have permission to create system users");
      }
    }

    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create the user with default role
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      role: args.role || ROLES.READER, // Default to READER if not specified
    });

    return userId;
  },
});

// Update user information
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal(ROLES.OWNER),
      v.literal(ROLES.MANAGER),
      v.literal(ROLES.COLLABORATOR),
      v.literal(ROLES.READER)
    )),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Allow OWNER global role to always edit system users (bypass permission check)
    if (currentUser.role !== ROLES.OWNER) {
      // For non-owners, check permissions
      const canEdit = await checkUserPermission(
        ctx,
        currentUser._id,
        SYSTEM_AREAS.SYSTEM_USERS,
        "edit"
      );

      if (!canEdit) {
        throw new Error("You don't have permission to edit system users");
      }
    }

    // If email is being updated, check if it's already in use
    if (args.email !== undefined) {
      const emailToCheck = args.email as string;
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", emailToCheck))
        .first();

      if (existingUser && existingUser._id !== args.userId) {
        throw new Error("Email already in use by another user");
      }
    }

    const updateData: any = {};
    if (args.name !== undefined) updateData.name = args.name;
    if (args.email !== undefined) updateData.email = args.email;
    if (args.role !== undefined) updateData.role = args.role;

    await ctx.db.patch(args.userId, updateData);
  },
});

export const toggleUserBlock = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Allow OWNER global role to always block/unblock users (bypass permission check)
    if (currentUser.role !== ROLES.OWNER) {
      // For non-owners, check permissions
      const canEdit = await checkUserPermission(
        ctx,
        currentUser._id,
        SYSTEM_AREAS.SYSTEM_USERS,
        "edit"
      );

      if (!canEdit) {
        throw new Error("You don't have permission to block/unblock users");
      }
    }

    const userToToggle = await ctx.db.get(args.userId);
    if (!userToToggle) {
      throw new Error("User not found");
    }

    if (userToToggle._id === currentUser._id) {
      throw new Error("Cannot block yourself");
    }

    await ctx.db.patch(args.userId, {
      isBlocked: !userToToggle.isBlocked,
    });
  },
});

// Delete a user (Admin only - requires workspace owner permission)
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Prevent users from deleting themselves
    if (currentUser._id === args.userId) {
      throw new Error("You cannot delete your own account");
    }

    // Allow OWNER global role to always delete system users (bypass permission check)
    if (currentUser.role !== ROLES.OWNER) {
      // For non-owners, check permissions
      const canDelete = await checkUserPermission(
        ctx,
        currentUser._id,
        SYSTEM_AREAS.SYSTEM_USERS,
        "delete"
      );

      if (!canDelete) {
        throw new Error("You don't have permission to delete system users");
      }
    }

    // Transfer ownership of workgroups to the current admin
    const targetUserWorkgroups = await ctx.db
      .query("workgroups")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    for (const workgroup of targetUserWorkgroups) {
      await ctx.db.patch(workgroup._id, {
        ownerId: currentUser._id,
      });

      // Ensure admin is a member with OWNER role
      const adminMembership = await ctx.db
        .query("workgroup_members")
        .withIndex("by_workgroup_and_user", (q) =>
          q.eq("workgroupId", workgroup._id).eq("userId", currentUser._id)
        )
        .first();

      if (adminMembership) {
        if (adminMembership.role !== ROLES.OWNER) {
          await ctx.db.patch(adminMembership._id, { role: ROLES.OWNER });
        }
      } else {
        await ctx.db.insert("workgroup_members", {
          workgroupId: workgroup._id,
          userId: currentUser._id,
          role: ROLES.OWNER,
        });
      }
    }

    // Transfer ownership of projects to the current admin
    const targetUserProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    for (const project of targetUserProjects) {
      await ctx.db.patch(project._id, {
        ownerId: currentUser._id,
      });

      // Ensure admin is a project member with OWNER role
      const adminProjectMembership = await ctx.db
        .query("project_members")
        .withIndex("by_project_and_user", (q) =>
          q.eq("projectId", project._id).eq("userId", currentUser._id)
        )
        .first();

      if (adminProjectMembership) {
        if (adminProjectMembership.role !== ROLES.OWNER) {
          await ctx.db.patch(adminProjectMembership._id, { role: ROLES.OWNER });
        }
      } else {
        await ctx.db.insert("project_members", {
          projectId: project._id,
          userId: currentUser._id,
          role: ROLES.OWNER,
        });
      }
    }

    // Remove all workgroup memberships
    const memberships = await ctx.db
      .query("workgroup_members")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // Clean up auth-related records before deleting the user
    // Delete auth accounts
    const authAccounts = await ctx.db
      .query("authAccounts")
      .collect();
    
    for (const account of authAccounts) {
      if (account.userId === args.userId) {
        await ctx.db.delete(account._id);
      }
    }

    // Delete auth sessions
    const authSessions = await ctx.db
      .query("authSessions")
      .collect();
    
    for (const session of authSessions) {
      if (session.userId === args.userId) {
        await ctx.db.delete(session._id);
      }
    }

    // Delete auth verification codes
    const authVerificationCodes = await ctx.db
      .query("authVerificationCodes")
      .collect();
    
    for (const code of authVerificationCodes) {
      if (code.accountId) {
        const account = await ctx.db.get(code.accountId);
        if (account && account.userId === args.userId) {
          await ctx.db.delete(code._id);
        }
      }
    }

    // Delete auth refresh tokens
    const authRefreshTokens = await ctx.db
      .query("authRefreshTokens")
      .collect();
    
    for (const token of authRefreshTokens) {
      if (token.sessionId) {
        const session = await ctx.db.get(token.sessionId);
        if (session && session.userId === args.userId) {
          await ctx.db.delete(token._id);
        }
      }
    }

    // Delete the user
    await ctx.db.delete(args.userId);
  },
});

// Add user to workgroup
export const addUserToWorkgroup = mutation({
  args: {
    userId: v.id("users"),
    workgroupId: v.id("workgroups"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Check if current user has permission
    const currentUserMembership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", currentUser._id)
      )
      .first();

    if (
      !currentUserMembership ||
      (currentUserMembership.role !== ROLES.OWNER &&
        currentUserMembership.role !== ROLES.MANAGER)
    ) {
      throw new Error("Insufficient permissions");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", args.userId)
      )
      .first();

    if (existingMembership) {
      throw new Error("User is already a member of this workspace");
    }

    // Add the user to the workgroup
    await ctx.db.insert("workgroup_members", {
      workgroupId: args.workgroupId,
      userId: args.userId,
      role: args.role as any,
    });
  },
});

// Update user's global role in the system
export const updateGlobalUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal(ROLES.OWNER),
      v.literal(ROLES.MANAGER),
      v.literal(ROLES.COLLABORATOR),
      v.literal(ROLES.READER)
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Only OWNER can update global roles
    if (currentUser.role !== ROLES.OWNER) {
      throw new Error("Only system owners can update global user roles");
    }

    // Prevent users from changing their own role
    if (currentUser._id === args.userId) {
      throw new Error("You cannot change your own global role");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
    });
  },
});

// Update user role in a workgroup
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    workgroupId: v.id("workgroups"),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Check if current user has permission (must be owner or manager)
    const currentUserMembership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", currentUser._id)
      )
      .first();

    if (
      !currentUserMembership ||
      (currentUserMembership.role !== ROLES.OWNER &&
        currentUserMembership.role !== ROLES.MANAGER)
    ) {
      throw new Error("Insufficient permissions");
    }

    // Find the membership to update
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", args.userId)
      )
      .first();

    if (!membership) throw new Error("Membership not found");

    // Update the role
    await ctx.db.patch(membership._id, {
      role: args.newRole as any,
    });
  },
});

// Remove user from workgroup
export const removeUserFromWorkgroup = mutation({
  args: {
    userId: v.id("users"),
    workgroupId: v.id("workgroups"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Check if current user has permission
    const currentUserMembership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", currentUser._id)
      )
      .first();

    if (
      !currentUserMembership ||
      (currentUserMembership.role !== ROLES.OWNER &&
        currentUserMembership.role !== ROLES.MANAGER)
    ) {
      throw new Error("Insufficient permissions");
    }

    // Find and delete the membership
    const membership = await ctx.db
      .query("workgroup_members")
      .withIndex("by_workgroup_and_user", (q) =>
        q.eq("workgroupId", args.workgroupId).eq("userId", args.userId)
      )
      .first();

    if (!membership) throw new Error("Membership not found");

    await ctx.db.delete(membership._id);
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const users = await ctx.db.query("users").collect();
    
    // Return users with their blocked status
    return users.map(u => ({
      ...u,
      isBlocked: u.isBlocked ?? false
    }));
  },
});