import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { ROLES } from "./schema";

// Permission types for different system areas
export const SYSTEM_AREAS = {
  WORKSPACES: "workspaces",
  SYSTEM_USERS: "system_users",
  TEAMS: "teams",
  PROJECTS: "projects",
  TASKS: "tasks",
  COMPANIES: "companies",
} as const;

// Default permissions for each role
const DEFAULT_PERMISSIONS = {
  [ROLES.OWNER]: {
    workspaces: { view: true, create: true, edit: true, delete: true },
    system_users: { view: true, create: true, edit: true, delete: true },
    teams: { view: true, create: true, edit: true, delete: true },
    projects: { view: true, create: true, edit: true, delete: true },
    tasks: { view: true, create: true, edit: true, delete: true },
  },
  [ROLES.MANAGER]: {
    workspaces: { view: true, create: true, edit: true, delete: false },
    system_users: { view: true, create: true, edit: true, delete: false },
    teams: { view: true, create: true, edit: true, delete: false },
    projects: { view: true, create: true, edit: true, delete: false },
    tasks: { view: true, create: true, edit: true, delete: true },
  },
  [ROLES.COLLABORATOR]: {
    workspaces: { view: true, create: false, edit: false, delete: false },
    system_users: { view: false, create: false, edit: false, delete: false },
    teams: { view: false, create: false, edit: false, delete: false },
    projects: { view: true, create: false, edit: true, delete: false },
    tasks: { view: true, create: true, edit: true, delete: false },
  },
  [ROLES.READER]: {
    workspaces: { view: true, create: false, edit: false, delete: false },
    system_users: { view: true, create: false, edit: false, delete: false },
    teams: { view: true, create: false, edit: false, delete: false },
    projects: { view: true, create: false, edit: false, delete: false },
    tasks: { view: true, create: false, edit: false, delete: false },
  },
};

// Get all role permissions
export const getRolePermissions = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      // Return default permissions if not authenticated
      return DEFAULT_PERMISSIONS;
    }

    // Get custom permissions from database
    const customPermissions = await ctx.db.query("role_permissions").collect();

    // Merge with defaults
    const permissions: any = {};
    for (const role of Object.values(ROLES)) {
      permissions[role] = { ...DEFAULT_PERMISSIONS[role] };
      
      // Override with custom permissions
      const customForRole = customPermissions.filter(p => p.role === role.toLowerCase());
      for (const custom of customForRole) {
        if (!permissions[role][custom.area]) {
          permissions[role][custom.area] = {};
        }
        permissions[role][custom.area] = {
          view: custom.canView,
          create: custom.canCreate,
          edit: custom.canEdit,
          delete: custom.canDelete,
        };
      }
    }

    return permissions;
  },
});

// Update role permissions
export const updateRolePermission = mutation({
  args: {
    role: v.string(),
    area: v.string(),
    canView: v.boolean(),
    canCreate: v.boolean(),
    canEdit: v.boolean(),
    canDelete: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Check if user has OWNER global role
    if (currentUser.role !== ROLES.OWNER) {
      throw new Error("Only users with OWNER role can modify permissions");
    }

    // Normalize role to lowercase for consistent storage
    const normalizedRole = args.role.toLowerCase();

    // Check if permission already exists
    const existing = await ctx.db
      .query("role_permissions")
      .filter((q) =>
        q.and(
          q.eq(q.field("role"), normalizedRole),
          q.eq(q.field("area"), args.area)
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        canView: args.canView,
        canCreate: args.canCreate,
        canEdit: args.canEdit,
        canDelete: args.canDelete,
      });
    } else {
      await ctx.db.insert("role_permissions", {
        role: normalizedRole as any,
        area: args.area,
        canView: args.canView,
        canCreate: args.canCreate,
        canEdit: args.canEdit,
        canDelete: args.canDelete,
      });
    }
  },
});

// Reset permissions to default
export const resetToDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Not authenticated");

    // Check if user has OWNER global role
    if (currentUser.role !== ROLES.OWNER) {
      throw new Error("Only users with OWNER role can reset permissions");
    }

    // Delete all custom permissions
    const allPermissions = await ctx.db.query("role_permissions").collect();
    for (const perm of allPermissions) {
      await ctx.db.delete(perm._id);
    }
  },
});

// Helper function to check if a user has permission for an action
export const checkPermission = async (
  ctx: any,
  userId: string,
  workgroupId: string,
  area: string,
  action: "view" | "create" | "edit" | "delete"
): Promise<boolean> => {
  // Get user's role in the workgroup
  const membership = await ctx.db
    .query("workgroup_members")
    .withIndex("by_workgroup_and_user", (q: any) =>
      q.eq("workgroupId", workgroupId).eq("userId", userId)
    )
    .first();

  if (!membership) return false;

  const role = membership.role as keyof typeof DEFAULT_PERMISSIONS;

  // Get custom permissions for this role and area
  const customPermission = await ctx.db
    .query("role_permissions")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("role"), role),
        q.eq(q.field("area"), area)
      )
    )
    .first();

  // If custom permission exists, use it
  if (customPermission) {
    switch (action) {
      case "view":
        return customPermission.canView;
      case "create":
        return customPermission.canCreate;
      case "edit":
        return customPermission.canEdit;
      case "delete":
        return customPermission.canDelete;
    }
  }

  // Otherwise, use default permissions
  const defaultPerms = DEFAULT_PERMISSIONS[role]?.[area as keyof typeof DEFAULT_PERMISSIONS[typeof role]];
  if (!defaultPerms) return false;

  return defaultPerms[action] || false;
};

// Query to check user's permission for a specific action
export const hasPermission = query({
  args: {
    workgroupId: v.id("workgroups"),
    area: v.string(),
    action: v.union(
      v.literal("view"),
      v.literal("create"),
      v.literal("edit"),
      v.literal("delete")
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return false;

    return await checkPermission(
      ctx,
      currentUser._id,
      args.workgroupId,
      args.area,
      args.action
    );
  },
});
