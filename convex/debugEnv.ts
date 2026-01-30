import { internalAction } from "./_generated/server";

export const checkEnv = internalAction({
  args: {},
  handler: async (ctx) => {
    const siteUrl = process.env.CONVEX_SITE_URL;
    const jwtKey = process.env.JWT_PRIVATE_KEY;

    console.log("Checking Environment Variables:");
    
    if (!siteUrl) {
      console.log("❌ CONVEX_SITE_URL is MISSING.");
    } else {
      console.log(`✅ CONVEX_SITE_URL is set to: ${siteUrl}`);
    }

    if (!jwtKey) {
      console.log("❌ JWT_PRIVATE_KEY is MISSING.");
    } else {
      // Check if it looks like a PEM key
      const isPem = jwtKey.includes("-----BEGIN PRIVATE KEY-----");
      console.log(`✅ JWT_PRIVATE_KEY is set (Length: ${jwtKey.length} chars).`);
      if (!isPem) {
        console.log("⚠️ JWT_PRIVATE_KEY does not look like a valid PEM format (missing header).");
      } else {
        console.log("✅ JWT_PRIVATE_KEY has correct PEM header.");
      }
    }
  },
});
