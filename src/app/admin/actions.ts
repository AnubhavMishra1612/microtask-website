"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSession, invalidateAdminSession, requireAdmin } from "@/lib/session";
import { adminLoginSchema } from "@/lib/validations";

export interface AdminLoginState {
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
}

export async function adminLoginAction(
  prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase() || "";
  const password = (formData.get("password") as string) || "";
  const from = (formData.get("from") as string) || "/admin";

  // 1. Persistent Rate Limiting
  const headersList = headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const rateLimitKey = `admin_login_ip_${ip}`;

  const rateCheck = await checkRateLimit({
    key: rateLimitKey,
    maxAttempts: 5,
    windowSeconds: 900, // 5 attempts per 15 minutes
  });

  if (!rateCheck.allowed) {
    return {
      error: "Too many login attempts. Access is temporarily restricted. Please try again in 15 minutes.",
    };
  }

  // 2. Schema Validation
  const validation = adminLoginSchema.safeParse({ email, password });
  if (!validation.success) {
    const fieldErrors: AdminLoginState["fieldErrors"] = {};
    for (const issue of validation.error.issues) {
      if (issue.path[0] === "email") fieldErrors.email = issue.message;
      if (issue.path[0] === "password") fieldErrors.password = issue.message;
    }
    return { fieldErrors };
  }

  // 3. User Authentication
  const admin = await prisma.adminUser.findUnique({
    where: { email },
  });

  // Timing-safe check & generic error response (never reveal email existence)
  const isPasswordValid = admin ? await verifyPassword(password, admin.passwordHash) : false;

  if (!admin || !isPasswordValid) {
    return {
      error: "Invalid email address or password.",
    };
  }

  // 4. Create Database Session & Secure Cookie
  await createAdminSession(admin.id);

  // 5. Open Redirect Protection: Only allow paths starting with /admin without protocol
  let destination = "/admin";
  if (from && from.startsWith("/admin") && !from.includes("://") && !from.startsWith("//")) {
    destination = from;
  }

  redirect(destination);
}

export async function adminLogoutAction() {
  await invalidateAdminSession();
  redirect("/admin/login");
}
