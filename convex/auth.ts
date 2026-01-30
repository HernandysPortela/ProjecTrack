// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";
import { passwordReset } from "./auth/passwordReset";
import { ROLES } from "./schema";
import { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    emailOtp, 
    Anonymous, 
    Password({ 
      reset: passwordReset,
      profile(params) {
        const profile: { email: string; name?: string } = {
          email: params.email as string,
        };
        if (params.name) {
          profile.name = params.name as string;
        }
        return profile;
      },
    })
  ],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      console.log("createOrUpdateUser called with:", args);
      
      // Check if user already exists
      const existingUser = args.existingUserId 
        ? await ctx.db.get(args.existingUserId)
        : null;

      // If user exists, ensure they have a role
      if (existingUser) {
        // If the user doesn't have a role, assign the default role
        if (!existingUser.role) {
          await ctx.db.patch(existingUser._id, {
            role: ROLES.READER,
          });
        }
        return existingUser._id;
      }

      // Extract email safely
      const rawEmail = args.profile.email as string | undefined;
      const email = rawEmail?.toLowerCase();

      // Check if a user with the same email already exists (to prevent duplicates)
      if (email) {
        const existingUserByEmail = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first();

        if (existingUserByEmail) {
          // If the user doesn't have a role, assign the default role
          if (!existingUserByEmail.role) {
            await ctx.db.patch(existingUserByEmail._id, {
              role: ROLES.READER,
            });
          }
          return existingUserByEmail._id;
        }
      }

      // Check if this is the first user in the system
      const allUsers = await ctx.db.query("users").collect();
      const isFirstUser = allUsers.length === 0;

      // Sanitize profile data to match schema and avoid errors with unknown fields
      const userData = {
        name: (args.profile.name as string) || "User",
        email: email || "",
        image: args.profile.image as string | undefined,
        role: isFirstUser ? ROLES.OWNER : ROLES.READER, // First user becomes Admin (OWNER)
        // Explicitly do not include other fields from args.profile to prevent schema validation errors
      };

      console.log("Creating new user with data:", userData);
      console.log("Is first user (Admin):", isFirstUser);

      // For new users, assign role based on whether they're the first user
      const userId = await ctx.db.insert("users", userData);

      return userId;
    },
  },
});