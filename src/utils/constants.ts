/**
 * Constants that are safe to use in the browser (frontend)
 * These should match the server-side definitions in convex/schema.ts
 */

// RBAC roles
export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  COLLABORATOR: "collaborator",
  READER: "reader",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Task status
export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  DONE: "done",
  BLOCKED: "blocked",
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

// Task priority
export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TaskPriority = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY];

// System areas (permissions)
export const SYSTEM_AREAS = {
  PROJECTS: "projects",
  TEAMS: "teams",
  WORKSPACES: "workspaces",
  USERS: "users",
} as const;

export type SystemArea = typeof SYSTEM_AREAS[keyof typeof SYSTEM_AREAS];
