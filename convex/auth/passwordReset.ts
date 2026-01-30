import { Email } from "@convex-dev/auth/providers/Email";

function generateRandomString(length: number, chars: string) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const alphabet = (type: string) => {
  if (type === "0-9") return "0123456789";
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
};

export const passwordReset = Email({
  id: "password-reset",
  maxAge: 60 * 15, // 15 minutes
  generateVerificationToken() {
    return generateRandomString(6, alphabet("0-9"));
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const siteUrl = process.env.CONVEX_SITE_URL;
    
    if (siteUrl) {
      try {
        const response = await fetch(`${siteUrl}/send-password-reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token }),
        });

        if (response.ok) {
          return;
        }
        console.error("Failed to send password reset via internal route, status:", response.status);
      } catch (error) {
        console.error("Error sending password reset via internal route:", error);
      }
    }

    // Fallback to vly.ai service
    try {
      const response = await fetch("https://email.vly.ai/send_otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "vlytothemoon2025",
        },
        body: JSON.stringify({
          to: email,
          otp: token,
          appName: process.env.VLY_APP_NAME || "ProjecTrak",
          subject: "Reset your password",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send password reset: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});