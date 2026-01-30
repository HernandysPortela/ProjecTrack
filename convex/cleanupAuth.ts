import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Clean up orphaned auth accounts that reference non-existent users
 * This should be run when you get "Update on nonexistent document" errors
 */
export const cleanupOrphanedAuthAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all auth accounts
    const authAccounts = await ctx.db.query("authAccounts").collect();
    
    let deletedCount = 0;
    
    for (const account of authAccounts) {
      // Check if the user exists
      const user = await ctx.db.get(account.userId);
      
      if (!user) {
        // User doesn't exist, delete the orphaned auth account
        await ctx.db.delete(account._id);
        deletedCount++;
        console.log(`Deleted orphaned auth account for user ID: ${account.userId}`);
      }
    }
    
    // Also clean up orphaned sessions
    const authSessions = await ctx.db.query("authSessions").collect();
    let deletedSessions = 0;
    
    for (const session of authSessions) {
      const user = await ctx.db.get(session.userId);
      
      if (!user) {
        await ctx.db.delete(session._id);
        deletedSessions++;
        console.log(`Deleted orphaned auth session for user ID: ${session.userId}`);
      }
    }
    
    return {
      deletedAccounts: deletedCount,
      deletedSessions: deletedSessions,
      message: `Cleaned up ${deletedCount} orphaned auth accounts and ${deletedSessions} orphaned sessions`
    };
  },
});

/**
 * Clean up a specific orphaned auth account by email
 */
export const cleanupAuthAccountByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Find auth accounts with this email
    const authAccounts = await ctx.db
      .query("authAccounts")
      .collect();
    
    let deletedCount = 0;
    
    for (const account of authAccounts) {
      // Check if this account matches the email and if the user exists
      if (account.emailVerified === args.email) {
        const user = await ctx.db.get(account.userId);
        
        if (!user) {
          await ctx.db.delete(account._id);
          deletedCount++;
          console.log(`Deleted orphaned auth account for email: ${args.email}, user ID: ${account.userId}`);
        }
      }
    }
    
    return {
      deletedCount,
      message: `Cleaned up ${deletedCount} orphaned auth accounts for email: ${args.email}`
    };
  },
});
