import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ROLES } from "./schema";

// Permission types for different system areas
export const SYSTEM_AREAS = {
  WORKSPACES: "workspaces",
  SYSTEM_USERS: "system_users",
  TEAMS: "teams",
  PROJECTS: "projects",
  TASKS: "tasks",
  COMPANIES: "companies",
  DEPARTMENTS: "departments",
} as const;

// Default permissions for each role
const DEFAULT_PERMISSIONS = {
  [ROLES.OWNER]: {
    workspaces: { view: true, create: true, edit: true, delete: true },
    system_users: { view: true, create: true, edit: true, delete: true },
    teams: { view: true, create: true, edit: true, delete: true },
    projects: { view: true, create: true, edit: true, delete: true },
    tasks: { view: true, create: true, edit: true, delete: true },
    companies: { view: true, create: true, edit: true, delete: true },
    departments: { view: true, create: true, edit: true, delete: true },
  },
  [ROLES.MANAGER]: {
    workspaces: { view: true, create: true, edit: true, delete: false },
    system_users: { view: true, create: true, edit: true, delete: false },
    teams: { view: true, create: true, edit: true, delete: false },
    projects: { view: true, create: true, edit: true, delete: false },
    tasks: { view: true, create: true, edit: true, delete: true },
    companies: { view: true, create: true, edit: true, delete: false },
    departments: { view: true, create: true, edit: true, delete: true },
  },
  [ROLES.COLLABORATOR]: {
    workspaces: { view: true, create: false, edit: false, delete: false },
    system_users: { view: true, create: false, edit: false, delete: false },
    teams: { view: true, create: false, edit: false, delete: false },
    projects: { view: true, create: false, edit: true, delete: false },
    tasks: { view: true, create: true, edit: true, delete: false },
    companies: { view: true, create: false, edit: false, delete: false },
    departments: { view: true, create: false, edit: false, delete: false },
  },
  [ROLES.READER]: {
    workspaces: { view: true, create: false, edit: false, delete: false },
    system_users: { view: true, create: false, edit: false, delete: false },
    teams: { view: true, create: false, edit: false, delete: false },
    projects: { view: true, create: false, edit: false, delete: false },
    tasks: { view: true, create: false, edit: false, delete: false },
    companies: { view: true, create: false, edit: false, delete: false },
    departments: { view: true, create: false, edit: false, delete: false },
  },
};

/**
 * Get user's role in a workgroup
 */
export async function getUserWorkgroupRole(
  ctx: QueryCtx,
  userId: Id<"users">,
  workgroupId: Id<"workgroups">
) {
  const membership = await ctx.db
    .query("workgroup_members")
    .withIndex("by_workgroup_and_user", (q) =>
      q.eq("workgroupId", workgroupId).eq("userId", userId)
    )
    .first();

  return membership?.role || null;
}

/**
 * Check if a role has permission for a specific action
 */
export async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  role: string,
  area: string,
  action: "view" | "create" | "edit" | "delete"
): Promise<boolean> {
  // Normalize role to lowercase for consistent comparison
  const normalizedRole = role.toLowerCase();

  // Log for debugging
  console.log(`[Permission Check] Role: ${normalizedRole}, Area: ${area}, Action: ${action}`);

  // Get custom permissions from database using index
  const customPermission = await ctx.db
    .query("role_permissions")
    .withIndex("by_role_and_area", (q) =>
      q.eq("role", normalizedRole as any).eq("area", area)
    )
    .first();

  console.log(`[Permission Check] Custom permission found:`, customPermission);

  if (customPermission) {
    let result: boolean;
    switch (action) {
      case "view":
        result = customPermission.canView;
        break;
      case "create":
        result = customPermission.canCreate;
        break;
      case "edit":
        result = customPermission.canEdit;
        break;
      case "delete":
        result = customPermission.canDelete;
        break;
    }
    console.log(`[Permission Check] Custom permission result: ${result}`);
    return result;
  }

  // Fall back to default permissions
  const defaultPerms = DEFAULT_PERMISSIONS[normalizedRole as keyof typeof DEFAULT_PERMISSIONS];
  if (defaultPerms && defaultPerms[area as keyof typeof defaultPerms]) {
    const result = defaultPerms[area as keyof typeof defaultPerms][action];
    console.log(`[Permission Check] Default permission result: ${result}`);
    return result;
  }

  console.log(`[Permission Check] No permission found, returning false`);
  return false;
}

/**
 * Check if user has permission based on their global role
 */
export async function checkUserPermission(
  ctx: QueryCtx,
  userId: Id<"users">,
  area: string,
  action: "view" | "create" | "edit" | "delete"
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user || !user.role) {
    return false;
  }

  return await checkPermission(ctx, user.role, area, action);
}

/**
 * Verify user has permission or throw error
 */
export async function requirePermission(
  ctx: QueryCtx,
  role: string,
  area: string,
  action: "view" | "create" | "edit" | "delete"
) {
  const hasPermission = await checkPermission(ctx, role, area, action);
  if (!hasPermission) {
    throw new Error(`Insufficient permissions: ${role} cannot ${action} ${area}`);
  }
}