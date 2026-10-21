import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { generateSessionToken } from "./reference";

export const USER_SESSION_COOKIE = "user_session_token";
export const USER_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface UserPayload {
  id: string;
  name: string;
  contactInfo: string;
}

/**
 * Creates a revocable database session for a worker user and sets a secure HTTP-only cookie
 */
export async function createUserSession(userId: string): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + USER_SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.userSession.create({
    data: {
      sessionToken,
      userId,
      expiresAt,
    },
  });

  const cookieStore = cookies();
  cookieStore.set(USER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: USER_SESSION_MAX_AGE_SECONDS,
  });

  return sessionToken;
}

/**
 * Validates the current user session from the cookie and database.
 * Returns the user payload or null if invalid or expired.
 */
export async function getCurrentUser(): Promise<UserPayload | null> {
  try {
    let token: string | undefined;
    try {
      const cookieStore = cookies();
      token = cookieStore.get(USER_SESSION_COOKIE)?.value;
    } catch {
      // Called outside Next.js request scope (e.g. during test runner execution)
      return null;
    }

    if (!token) {
      return null;
    }

    const session = await prisma.userSession.findUnique({
      where: { sessionToken: token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            contactInfo: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.user;
  } catch (error) {
    console.error("Error retrieving current user session:", error);
    return null;
  }
}

/**
 * Enforces user authentication in Server Actions and Route Handlers.
 * Throws an Error if unauthenticated.
 */
export async function requireUser(): Promise<UserPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: User authentication required");
  }
  return user;
}

/**
 * Invalidates the current user session and clears the cookie.
 */
export async function invalidateUserSession(): Promise<void> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(USER_SESSION_COOKIE)?.value;

    if (token) {
      await prisma.userSession.deleteMany({
        where: { sessionToken: token },
      });
    }

    cookieStore.delete(USER_SESSION_COOKIE);
  } catch (error) {
    console.error("Error invalidating user session:", error);
  }
}
