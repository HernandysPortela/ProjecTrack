import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { ROLES } from "./schema";
import { checkUserPermission, SYSTEM_AREAS } from "./permissionHelpers";

export const createCompany = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.role !== ROLES.OWNER) {
      throw new Error("Apenas administradores podem criar empresas.");
    }

    // Check if user already has a company
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .first();

    if (existing) {
      throw new Error("User already has a company");
    }

    const companyId = await ctx.db.insert("companies", {
      ...args,
      createdBy: userId,
    });

    // Automatically associate the creator with the company
    await ctx.db.patch(userId, { companyId });

    return companyId;
  },
});

export const updateCompany = mutation({
  args: {
    id: v.id("companies"),
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.role !== ROLES.OWNER) {
      throw new Error("Apenas administradores podem atualizar empresas.");
    }

    const company = await ctx.db.get(args.id);
    if (!company) throw new Error("Company not found");

    // Allow update if user is creator OR if user is an admin/manager of the company
    // The user wants ONLY admin profile to have access.
    // We already checked user.role === ROLES.OWNER above.

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const getCompany = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const company = await ctx.db
      .query("companies")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .first();

    // console.log(`getCompany for user ${userId}:`, company ? "found" : "not found");

    if (company) return company;

    // Fallback: If user is not the creator but has a companyId, return that company
    // This allows members to view the company details
    const user = await ctx.db.get(userId);
    if (user?.companyId) {
      const linkedCompany = await ctx.db.get(user.companyId);
      // console.log(`getCompany via companyId for user ${userId}:`, linkedCompany ? "found" : "not found");
      return linkedCompany;
    }

    return null;
  },
});

export const debugCompanyStatus = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { error: "Not logged in" };

    const user = await ctx.db.get(userId);
    const createdCompanies = await ctx.db
      .query("companies")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .collect();

    const allCompanies = await ctx.db.query("companies").take(5);

    return {
      userId,
      userCompanyId: user?.companyId,
      createdCompaniesCount: createdCompanies.length,
      createdCompanies: createdCompanies,
      sampleCompanies: allCompanies,
    };
  },
});

export const getAllCompanies = query({
  handler: async (ctx) => {
    return await ctx.db.query("companies").collect();
  },
});

export const getCompanies = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db.query("companies").order("desc").paginate(args.paginationOpts);
  },
});

export const createDepartment = mutation({
  args: {
    name: v.string(),
    companyId: v.id("companies"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const hasPermission = await checkUserPermission(
      ctx,
      userId,
      SYSTEM_AREAS.DEPARTMENTS,
      "create"
    );

    if (!hasPermission) {
      console.warn(`User ${userId} (role: ${user.role}) attempted to create a department without permission.`);
      throw new Error("Apenas administradores e gerentes podem criar departamentos.");
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Department name cannot be empty");
    }

    // Check for duplicate department name in the same company
    const existing = await ctx.db
      .query("departments")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("name"), trimmedName))
      .first();

    if (existing) {
      throw new Error("Department already exists");
    }

    return await ctx.db.insert("departments", {
      ...args,
      name: trimmedName,
    });
  },
});

export const getDepartments = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("departments")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const deleteDepartment = mutation({
  args: { id: v.id("departments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const hasPermission = await checkUserPermission(
      ctx,
      userId,
      SYSTEM_AREAS.DEPARTMENTS,
      "delete"
    );

    if (!hasPermission) {
      console.warn(`User ${userId} (role: ${user.role}) attempted to delete a department without permission.`);
      throw new Error("Apenas administradores podem remover departamentos.");
    }

    const dept = await ctx.db.get(args.id);
    if (!dept) throw new Error("Department not found");

    const company = await ctx.db.get(dept.companyId);
    if (!company) throw new Error("Company not found");

    // Check if any users are linked to this department
    const linkedUsers = await ctx.db
      .query("users")
      .withIndex("by_department", (q) => q.eq("departmentId", args.id))
      .collect();

    if (linkedUsers.length > 0) {
      const userNames = linkedUsers.map(u => u.name || u.email).slice(0, 3).join(", ");
      const remaining = linkedUsers.length - 3;
      const moreText = remaining > 0 ? ` e mais ${remaining} usuário(s)` : "";

      throw new Error(
        `Não é possível excluir este departamento pois ele está vinculado ao(s) usuário(s): ${userNames}${moreText}. Remova o vínculo antes de excluir.`
      );
    }

    await ctx.db.delete(args.id);
  },
});