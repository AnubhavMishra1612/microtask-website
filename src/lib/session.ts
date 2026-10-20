import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { generateSessionToken } from "./reference";

export const ADMIN_SESSION_COOKIE = "admin_session_token";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AdminUserPayload {
  id: string;
  email: string;
  name: string;
}

/**
 * Creates a revocable database session for an admin and sets a secure HTTP-only cookie
 */
export async function createAdminSession(adminId: string): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.adminSession.create({
    data: {
      sessionToken,
      adminId,
      expiresAt,
    },
  });

  const cookieStore = cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return sessionToken;
}

/**
 * Validates the current admin session from the cookie and database.
 * Returns the admin payload or null if invalid or expired.
 */
export async function getCurrentAdmin(): Promise<AdminUserPayload | null> {
  try {
    let token: string | undefined;
    try {
      const cookieStore = cookies();
      token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    } catch {
      // Called outside Next.js request scope (e.g. during test runner execution)
      return null;
    }

    if (!token) {
      return null;
    }

    const session = await prisma.adminSession.findUnique({
      where: { sessionToken: token },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      // Invalidate expired session in background
      await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.admin;
  } catch (error) {
    console.error("Error retrieving current admin session:", error);
    return null;
  }
}

/**
 * Enforces admin authorization in Server Actions and Route Handlers.
 * Throws an Error if unauthenticated.
 */
export async function requireAdmin(): Promise<AdminUserPayload> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("UNAUTHORIZED: Admin authentication required");
  }
  return admin;
}

/**
 * Invalidates the current admin session and clears the cookie.
 */
export async function invalidateAdminSession(): Promise<void> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (token) {
      await prisma.adminSession.deleteMany({
        where: { sessionToken: token },
      });
    }

    cookieStore.delete(ADMIN_SESSION_COOKIE);
  } catch (error) {
    console.error("Error invalidating admin session:", error);
  }
}

/**
 * Revokes all active sessions for a specific admin user
 */
export async function invalidateAllAdminSessions(adminId: string): Promise<void> {
  await prisma.adminSession.deleteMany({
    where: { adminId },
  });
}
