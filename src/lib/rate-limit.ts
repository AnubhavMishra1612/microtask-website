import { prisma } from "./prisma";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  totalAttempts: number;
}

/**
 * Persistent rate limiting backed by PostgreSQL (Prisma RateLimitBucket).
 * Works reliably across serverless instances and multiple server nodes.
 * Does not rely on ephemeral in-memory state.
 */
export async function checkRateLimit({
  key,
  maxAttempts,
  windowSeconds,
}: {
  key: string;
  maxAttempts: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const bucket = await prisma.rateLimitBucket.findUnique({
      where: { key },
    });

    if (!bucket || bucket.resetAt <= now) {
      // Create or reset bucket
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          resetAt,
        },
        update: {
          count: 1,
          resetAt,
        },
      });

      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt,
        totalAttempts: 1,
      };
    }

    // Existing active window
    if (bucket.count >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.resetAt,
        totalAttempts: bucket.count,
      };
    }

    // Increment count
    const updated = await prisma.rateLimitBucket.update({
      where: { key },
      data: {
        count: { increment: 1 },
      },
    });

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - updated.count),
      resetAt: bucket.resetAt,
      totalAttempts: updated.count,
    };
  } catch (error) {
    // If DB is unreachable or during unit testing with mock, log and fail safely or allow
    console.error("Rate limiting error:", error);
    // Safe default to avoid locking out users if database rate limiter experiences transient connection glitch
    return {
      allowed: true,
      remaining: 1,
      resetAt,
      totalAttempts: 1,
    };
  }
}
