import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// RBAC roles
export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  COLLABORATOR: "collaborator",
  READER: "reader",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.OWNER),
  v.literal(ROLES.MANAGER),
  v.literal(ROLES.COLLABORATOR),
  v.literal(ROLES.READER),
);
export type Role = Infer<typeof roleValidator>;

// Task status
export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  DONE: "done",
  BLOCKED: "blocked",
} as const;

export const taskStatusValidator = v.union(
  v.literal(TASK_STATUS.TODO),
  v.literal(TASK_STATUS.IN_PROGRESS),
  v.literal(TASK_STATUS.REVIEW),
  v.literal(TASK_STATUS.DONE),
  v.literal(TASK_STATUS.BLOCKED),
  v.string(), // Allow custom statuses
);

// Task priority
export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export const taskPriorityValidator = v.union(
  v.literal(TASK_PRIORITY.LOW),
  v.literal(TASK_PRIORITY.MEDIUM),
  v.literal(TASK_PRIORITY.HIGH),
  v.literal(TASK_PRIORITY.URGENT),
);

// Task dependency types
export const DEPENDENCY_TYPES = {
  FINISH_TO_START: "finish_to_start",
  START_TO_START: "start_to_start",
  FINISH_TO_FINISH: "finish_to_finish",
  START_TO_FINISH: "start_to_finish",
} as const;

export const dependencyTypeValidator = v.union(
  v.literal(DEPENDENCY_TYPES.FINISH_TO_START),
  v.literal(DEPENDENCY_TYPES.START_TO_START),
  v.literal(DEPENDENCY_TYPES.FINISH_TO_FINISH),
  v.literal(DEPENDENCY_TYPES.START_TO_FINISH),
);

// Project approval status
export const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  BLOCKED: "blocked",
} as const;

export const approvalStatusValidator = v.union(
  v.literal(APPROVAL_STATUS.PENDING),
  v.literal(APPROVAL_STATUS.APPROVED),
  v.literal(APPROVAL_STATUS.BLOCKED),
);

// Recurrence patterns
export const RECURRENCE_PATTERN = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export const recurrencePatternValidator = v.union(
  v.literal(RECURRENCE_PATTERN.DAILY),
  v.literal(RECURRENCE_PATTERN.WEEKLY),
  v.literal(RECURRENCE_PATTERN.MONTHLY),
  v.literal(RECURRENCE_PATTERN.YEARLY),
);

const schema = defineSchema(
  {
    ...authTables,

  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("collaborator"),
      v.literal("reader")
    ),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    department: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    departmentId: v.optional(v.id("departments")),
    isBlocked: v.optional(v.boolean()),
    language: v.optional(v.union(
      v.literal("pt-BR"),
      v.literal("en"),
      v.literal("es")
    )),
  })
    .index("by_email", ["email"])
    .index("by_company", ["companyId"])
    .index("by_department", ["departmentId"])
    .searchIndex("search_name", { searchField: "name" }),

    // Invites table
    invites: defineTable({
      email: v.string(),
      name: v.string(),
      invitedBy: v.id("users"),
      workgroupId: v.id("workgroups"),
      token: v.string(),
      status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("cancelled"), v.literal("expired")),
      role: roleValidator,
      expiresAt: v.optional(v.number()),
      sentAt: v.optional(v.number()),
      workgroupName: v.optional(v.string()),
    })
      .index("by_email", ["email"])
      .index("by_token", ["token"])
      .index("by_status", ["status"])
      .index("by_workgroup", ["workgroupId"]),

    // Workgroups (teams)
    workgroups: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      ownerId: v.id("users"),
      notificationSettings: v.optional(v.object({
        enabled: v.boolean(),
        frequency: v.string(), // immediate, daily, weekly, never
        events: v.array(v.string()), // which events to notify about
        recipients: v.array(v.id("users")), // who receives notifications
      })),
    }).index("by_owner", ["ownerId"]),

    // Workgroup members with roles
    workgroup_members: defineTable({
      workgroupId: v.id("workgroups"),
      userId: v.id("users"),
      role: v.union(
        v.literal("owner"),
        v.literal("manager"),
        v.literal("collaborator"),
        v.literal("reader")
      ),
    })
      .index("by_workgroup", ["workgroupId"])
      .index("by_user", ["userId"])
      .index("by_workgroup_and_user", ["workgroupId", "userId"]),

    // Role-based permissions
    role_permissions: defineTable({
      role: roleValidator,
      area: v.string(),
      canView: v.boolean(),
      canCreate: v.boolean(),
      canEdit: v.boolean(),
      canDelete: v.boolean(),
    })
      .index("by_role", ["role"])
      .index("by_area", ["area"])
      .index("by_role_and_area", ["role", "area"]),

    // Projects
    projects: defineTable({
      workgroupId: v.id("workgroups"),
      folderId: v.optional(v.id("folders")),
      ownerId: v.optional(v.id("users")),
      managerId: v.optional(v.id("users")),
      name: v.string(),
      description: v.optional(v.string()),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      color: v.string(),
      status: v.optional(v.string()),
      taskCount: v.optional(v.number()),
      isCompleted: v.optional(v.boolean()),
      teamRestricted: v.optional(v.boolean()),
      allowedTeamIds: v.optional(v.array(v.id("teams"))),
      priority: v.optional(v.number()),
      startQuarter: v.optional(v.string()),
      startYear: v.optional(v.number()),
      approvalStatus: v.optional(approvalStatusValidator),
    })
      .index("by_workgroup", ["workgroupId"])
      .index("by_owner", ["ownerId"])
      .index("by_folder", ["folderId"]),

    // Project members (individual user access)
    project_members: defineTable({
      projectId: v.id("projects"),
      userId: v.id("users"),
      role: roleValidator,
    })
      .index("by_project", ["projectId"])
      .index("by_user", ["userId"])
      .index("by_project_and_user", ["projectId", "userId"]),

    // Kanban columns (custom statuses per project)
    kanban_columns: defineTable({
      projectId: v.id("projects"),
      name: v.string(),
      statusKey: v.string(),
      order: v.number(),
      color: v.optional(v.string()),
    })
      .index("by_project", ["projectId"])
      .index("by_project_and_order", ["projectId", "order"]),

    // Tasks and subtasks
    tasks: defineTable({
      projectId: v.id("projects"),
      parentTaskId: v.optional(v.id("tasks")),
      title: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      assigneeId: v.optional(v.id("users")),
      startDate: v.optional(v.number()),
      dueDate: v.optional(v.number()),
      priority: taskPriorityValidator,
      progress: v.number(),
      dependencyTaskId: v.optional(v.id("tasks")),
      dependenciesEnabled: v.optional(v.boolean()),
      blockedByTaskIds: v.optional(v.array(v.id("tasks"))),
      estimatedHours: v.optional(v.number()),
      order: v.optional(v.number()),
      // Recurrence fields
      isRecurring: v.optional(v.boolean()),
      recurrencePattern: v.optional(recurrencePatternValidator),
      recurrenceInterval: v.optional(v.number()), // e.g., every 2 weeks
      recurrenceEndDate: v.optional(v.number()),
      lastRecurrenceDate: v.optional(v.number()),
      // Completion tracking fields
      estimatedCost: v.optional(v.number()),
    })
      .index("by_project", ["projectId"])
      .index("by_assignee", ["assigneeId"])
      .index("by_parent", ["parentTaskId"])
      .index("by_status", ["status"])
      .index("by_due_date", ["dueDate"])
      .index("by_status_and_order", ["status", "order"]),

    // Checklist items for tasks
    checklist_items: defineTable({
      taskId: v.id("tasks"),
      text: v.string(),
      completed: v.boolean(),
      order: v.number(),
    }).index("by_task", ["taskId"]),

    // Tags for tasks
    tags: defineTable({
      projectId: v.id("projects"),
      name: v.string(),
      color: v.string(),
    }).index("by_project", ["projectId"]),

    // Task-Tag relationships
    task_tags: defineTable({
      taskId: v.id("tasks"),
      tagId: v.id("tags"),
    })
      .index("by_task", ["taskId"])
      .index("by_tag", ["tagId"])
      .index("by_task_and_tag", ["taskId", "tagId"]),

    // Comments
    comments: defineTable({
      taskId: v.id("tasks"),
      userId: v.id("users"),
      body: v.string(),
    }).index("by_task", ["taskId"]),

    // Attachments (OneDrive)
    attachments: defineTable({
      taskId: v.id("tasks"),
      provider: v.string(),
      fileName: v.string(),
      fileUrl: v.string(),
      driveItemId: v.optional(v.string()),
      size: v.optional(v.number()),
      uploadedBy: v.id("users"),
    }).index("by_task", ["taskId"]),

    // Microsoft 365 integrations
    integrations: defineTable({
      userId: v.id("users"),
      type: v.string(),
      accessToken: v.string(),
      refreshToken: v.optional(v.string()),
      expiresAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_type", ["userId", "type"]),

    // Calendar events
    events: defineTable({
      taskId: v.optional(v.id("tasks")),
      projectId: v.optional(v.id("projects")),
      userId: v.id("users"),
      title: v.string(),
      description: v.optional(v.string()),
      startTime: v.number(),
      endTime: v.number(),
      outlookEventId: v.optional(v.string()),
      attendees: v.optional(v.array(v.string())),
    })
      .index("by_user", ["userId"])
      .index("by_task", ["taskId"])
      .index("by_project", ["projectId"]),

    // Notifications
    notifications: defineTable({
      userId: v.id("users"),
      taskId: v.optional(v.id("tasks")),
      type: v.string(),
      message: v.string(),
      read: v.boolean(),
      sentAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_read", ["userId", "read"]),

    // Notification Queue
    notificationQueue: defineTable({
      userId: v.id("users"),
      workgroupId: v.id("workgroups"),
      event: v.string(),
      entityType: v.string(),
      entityId: v.string(),
      entityName: v.string(),
      details: v.string(),
      sent: v.boolean(),
      scheduledFor: v.optional(v.number()),
    })
      .index("by_user_and_sent", ["userId", "sent"])
      .index("by_workgroup_and_sent", ["workgroupId", "sent"]),

    // Email Logs
    emailLogs: defineTable({
      userId: v.id("users"),
      email: v.string(),
      subject: v.string(),
      event: v.string(),
      success: v.boolean(),
      error: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    // Activity log
    activity_log: defineTable({
      taskId: v.optional(v.id("tasks")),
      projectId: v.optional(v.id("projects")),
      userId: v.id("users"),
      action: v.string(),
      details: v.optional(v.string()),
    })
      .index("by_task", ["taskId"])
      .index("by_project", ["projectId"]),

    // Task permissions
    task_permissions: defineTable({
      taskId: v.id("tasks"),
      userId: v.id("users"),
      canView: v.boolean(),
      canEdit: v.boolean(),
      isBlocked: v.optional(v.boolean()), // Explicitly block user from viewing task
    })
      .index("by_task", ["taskId"])
      .index("by_user", ["userId"])
      .index("by_task_and_user", ["taskId", "userId"]),

    // Teams
    teams: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
    }).index("by_creator", ["createdBy"]),

    // Team members
    team_members: defineTable({
      teamId: v.id("teams"),
      userId: v.id("users"),
      role: v.optional(roleValidator),
    })
      .index("by_team", ["teamId"])
      .index("by_user", ["userId"])
      .index("by_team_and_user", ["teamId", "userId"]),

    // Reminder settings per user
    reminder_settings: defineTable({
      userId: v.id("users"),
      workgroupId: v.id("workgroups"),
      enabled: v.boolean(),
      includeOverdue: v.boolean(),
      notifyOnProjectChanges: v.optional(v.boolean()),
    })
      .index("by_user", ["userId"])
      .index("by_workgroup", ["workgroupId"])
      .index("by_user_and_workgroup", ["userId", "workgroupId"]),

    // Reminder log to track sent reminders
    reminder_log: defineTable({
      taskId: v.id("tasks"),
      userId: v.id("users"),
      reminderType: v.string(), // "upcoming" or "overdue"
      hoursBeforeDue: v.optional(v.number()),
      sentAt: v.number(),
    })
      .index("by_task", ["taskId"])
      .index("by_user", ["userId"])
      .index("by_task_and_user", ["taskId", "userId"]),

    // Companies
    companies: defineTable({
      name: v.string(),
      cnpj: v.string(),
      address: v.object({
        street: v.string(),
        number: v.string(),
        neighborhood: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
      }),
      createdBy: v.id("users"),
    }).index("by_creator", ["createdBy"]),

    // Departments
    departments: defineTable({
      name: v.string(),
      companyId: v.id("companies"),
      description: v.optional(v.string()),
    }).index("by_company", ["companyId"]),

    // Folders for organizing projects
    folders: defineTable({
      workgroupId: v.id("workgroups"),
      name: v.string(),
      description: v.optional(v.string()),
      color: v.optional(v.string()),
      order: v.optional(v.number()),
      isCollapsed: v.optional(v.boolean()),
    })
      .index("by_workgroup", ["workgroupId"])
      .index("by_workgroup_and_order", ["workgroupId", "order"]),

    // Task Dependencies
    taskDependencies: defineTable({
      taskId: v.id("tasks"),
      dependsOnTaskId: v.id("tasks"),
      dependencyType: dependencyTypeValidator,
    })
      .index("by_task", ["taskId"])
      .index("by_depends_on", ["dependsOnTaskId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;