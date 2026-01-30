import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/send-otp",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { email, token } = await req.json();
    
    try {
      await ctx.runAction(internal.emailService.sendOtpEmail, {
        email,
        token,
      });
      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
    }
  }),
});

http.route({
  path: "/send-password-reset",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { email, token } = await req.json();
    
    try {
      await ctx.runAction(internal.emailService.sendPasswordResetEmail, {
        email,
        token,
      });
      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
    }
  }),
});

export default http;