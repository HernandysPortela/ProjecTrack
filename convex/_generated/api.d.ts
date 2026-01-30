/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as auth_passwordReset from "../auth/passwordReset.js";
import type * as checklists from "../checklists.js";
import type * as cleanupAuth from "../cleanupAuth.js";
import type * as comments from "../comments.js";
import type * as companies from "../companies.js";
import type * as cronActions from "../cronActions.js";
import type * as cronHelpers from "../cronHelpers.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as debugEnv from "../debugEnv.js";
import type * as emailService from "../emailService.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as exports from "../exports.js";
import type * as fixUserRole from "../fixUserRole.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as kanban from "../kanban.js";
import type * as notificationTriggers from "../notificationTriggers.js";
import type * as notifications from "../notifications.js";
import type * as permissionHelpers from "../permissionHelpers.js";
import type * as permissions from "../permissions.js";
import type * as projectMembers from "../projectMembers.js";
import type * as projects from "../projects.js";
import type * as reminders from "../reminders.js";
import type * as tags from "../tags.js";
import type * as taskBlocking from "../taskBlocking.js";
import type * as taskDependencies from "../taskDependencies.js";
import type * as taskPermissions from "../taskPermissions.js";
import type * as tasks from "../tasks.js";
import type * as teams from "../teams.js";
import type * as templates_authTemplates from "../templates/authTemplates.js";
import type * as templates_digestTemplates from "../templates/digestTemplates.js";
import type * as templates_inviteTemplates from "../templates/inviteTemplates.js";
import type * as templates_notificationTemplates from "../templates/notificationTemplates.js";
import type * as templates_reminderTemplates from "../templates/reminderTemplates.js";
import type * as users from "../users.js";
import type * as workgroups from "../workgroups.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  attachments: typeof attachments;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  "auth/passwordReset": typeof auth_passwordReset;
  checklists: typeof checklists;
  cleanupAuth: typeof cleanupAuth;
  comments: typeof comments;
  companies: typeof companies;
  cronActions: typeof cronActions;
  cronHelpers: typeof cronHelpers;
  crons: typeof crons;
  dashboard: typeof dashboard;
  debugEnv: typeof debugEnv;
  emailService: typeof emailService;
  emailTemplates: typeof emailTemplates;
  exports: typeof exports;
  fixUserRole: typeof fixUserRole;
  http: typeof http;
  invites: typeof invites;
  kanban: typeof kanban;
  notificationTriggers: typeof notificationTriggers;
  notifications: typeof notifications;
  permissionHelpers: typeof permissionHelpers;
  permissions: typeof permissions;
  projectMembers: typeof projectMembers;
  projects: typeof projects;
  reminders: typeof reminders;
  tags: typeof tags;
  taskBlocking: typeof taskBlocking;
  taskDependencies: typeof taskDependencies;
  taskPermissions: typeof taskPermissions;
  tasks: typeof tasks;
  teams: typeof teams;
  "templates/authTemplates": typeof templates_authTemplates;
  "templates/digestTemplates": typeof templates_digestTemplates;
  "templates/inviteTemplates": typeof templates_inviteTemplates;
  "templates/notificationTemplates": typeof templates_notificationTemplates;
  "templates/reminderTemplates": typeof templates_reminderTemplates;
  users: typeof users;
  workgroups: typeof workgroups;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
