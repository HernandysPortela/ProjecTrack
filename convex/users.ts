import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
// import { internal } from "./_generated/api";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    console.log("currentUser query DEBUG - CONVEX_SITE_URL:", process.env.CONVEX_SITE_URL);
    const userId = await getAuthUserId(ctx);
    console.log("currentUser query DEBUG - getAuthUserId returned:", userId);
    if (!userId) {
      console.log("currentUser query DEBUG - returning null because userId is null");
      return null;
    }
    const user = await ctx.db.get(userId);
    console.log("currentUser query DEBUG - db.get returned user:", user ? "found" : "not found");

    if (!user) {
      console.log("currentUser query DEBUG - returning null because user not found in DB");
      return null;
    }

    // Resolve image URL if imageId exists
    let imageUrl = undefined;
    if (user.imageId) {
      imageUrl = await ctx.storage.getUrl(user.imageId);
      console.log(`Resolved imageUrl for user ${userId}: ${imageUrl ? 'found' : 'not found'} (imageId: ${user.imageId})`);
    }

    return {
      ...user,
      imageUrl,
      // If we have an imageId but no image field, use the URL.
      // If we have an image field (external auth), use that.
      // Prefer the uploaded image (imageUrl) over the external one if it exists.
      image: imageUrl || user.image,
    };
  },
});

/**
 * List all users in the system
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return Promise.all(
      users.map(async (u) => {
        let imageUrl = u.image;
        if (u.imageId) {
          const url = await ctx.storage.getUrl(u.imageId);
          if (url) {
            imageUrl = url;
          }
        }

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          isBlocked: u.isBlocked,
          _creationTime: u._creationTime,
          image: imageUrl,
          imageUrl,
        };
      })
    );
  },
});

/**
 * Check if an email already exists in the system
 */
export const checkEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    return !!user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

/**
 * Notify user about successful password reset
 */
export const notifyPasswordResetSuccess = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      return;
    }

    // await ctx.scheduler.runAfter(
    //   0,
    //   internal.emailService.sendPasswordResetConfirmationEmail,
    //   {
    //     email: user.email,
    //     userName: user.name || "Usuário",
    //   }
    // );
    console.log("Password reset confirmation email disabled");
  },
});

/**
 * Request password change for authenticated user
 * This triggers the password reset flow for the current user
 */
export const requestPasswordChange = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuário não autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("Email do usuário não encontrado");
    }

    return { email: user.email };
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const users = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(10);

    // Filter out blocked users
    return users.filter(u => !u.isBlocked);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (user?.isBlocked) {
      return null; // Treat blocked users as non-existent for login/lookup purposes if needed
    }
    return user;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    companyId: v.optional(v.id("companies")),
    departmentId: v.optional(v.id("departments")),
    language: v.optional(v.union(
      v.literal("pt-BR"),
      v.literal("en"),
      v.literal("es")
    )),
  },
  handler: async (ctx, args) => {
    let userId = await getAuthUserId(ctx);

    if (userId === null) {
      const identity = await ctx.auth.getUserIdentity();
      const identityEmail = identity?.email;

      if (identityEmail) {
        const existingUser = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", identityEmail))
          .first();

        if (existingUser) {
          userId = existingUser._id;
        }
      }
    }

    if (userId === null) {
      throw new Error("Not authenticated");
    }

    console.log("Updating profile for user:", userId);
    console.log("Args received:", args);

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.company !== undefined) updates.company = args.company;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.department !== undefined) updates.department = args.department;

    // Only update imageId if it is explicitly provided
    if (args.imageId !== undefined) {
      console.log("Updating imageId to:", args.imageId);
      updates.imageId = args.imageId;
    }

    if (args.companyId !== undefined) updates.companyId = args.companyId;
    if (args.departmentId !== undefined) updates.departmentId = args.departmentId;
    if (args.language !== undefined) {
      console.log("Updating language to:", args.language);
      updates.language = args.language;
    }

    console.log("Applying updates:", updates);
    await ctx.db.patch(userId, updates);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateLanguage = mutation({
  args: {
    language: v.union(
      v.literal("pt-BR"),
      v.literal("en"),
      v.literal("es")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(userId, {
      language: args.language,
    });

    return { success: true };
  },
});