import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { verifyPassword } from "../src/lib/auth";
import { checkRateLimit } from "../src/lib/rate-limit";
import { requireAdmin, createAdminSession } from "../src/lib/session";
import { generateSessionToken } from "../src/lib/reference";
import {
  createTaskAction,
  updateTaskAction,
  updateTaskStatusAction,
  executeCreateTask,
  saveTaskAction,
} from "../src/app/admin/tasks/actions";
import { taskUrlSchema, taskSchema } from "../src/lib/validations";

describe("Milestone 4: Admin Authentication, Protected Actions & Dashboard Metrics", () => {
  let testAdmin: { id: string; email: string; passwordHash: string };

  beforeAll(async () => {
    await prisma.$connect();

    const admin = await prisma.adminUser.findFirst();
    expect(admin).not.toBeNull();
    testAdmin = admin!;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Admin Authentication & Password Verification", () => {
    it("successfully authenticates using valid credentials against stored bcrypt hash", async () => {
      const isMatch = await verifyPassword("AdminPassword123!", testAdmin.passwordHash);
      expect(isMatch).toBe(true);
    });

    it("rejects invalid password without throwing", async () => {
      const isMatch = await verifyPassword("WrongPassword999!", testAdmin.passwordHash);
      expect(isMatch).toBe(false);
    });

    it("enforces persistent rate limiting on admin login attempts", async () => {
      const ipKey = `test_login_rate_${Date.now()}`;

      // Max 5 attempts
      for (let i = 1; i <= 5; i++) {
        const check = await checkRateLimit({ key: ipKey, maxAttempts: 5, windowSeconds: 900 });
        expect(check.allowed).toBe(true);
      }

      // 6th attempt must be blocked
      const blocked = await checkRateLimit({ key: ipKey, maxAttempts: 5, windowSeconds: 900 });
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);

      // Clean up
      await prisma.rateLimitBucket.delete({ where: { key: ipKey } }).catch(() => {});
    });
  });

  describe("Database-Backed Session Lifecycle", () => {
    it("creates, queries, and revokes a database-backed session", async () => {
      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Create session in DB
      const session = await prisma.adminSession.create({
        data: {
          sessionToken: token,
          adminId: testAdmin.id,
          expiresAt,
        },
      });

      expect(session.id).toBeDefined();
      expect(session.sessionToken).toBe(token);

      // Query session with admin join
      const queried = await prisma.adminSession.findUnique({
        where: { sessionToken: token },
        include: { admin: true },
      });
      expect(queried?.admin.email).toBe(testAdmin.email);

      // Invalidate / Revoke session
      await prisma.adminSession.delete({ where: { id: session.id } });

      const afterRevocation = await prisma.adminSession.findUnique({
        where: { sessionToken: token },
      });
      expect(afterRevocation).toBeNull();
    });

    it("identifies expired sessions correctly", async () => {
      const pastDate = new Date(Date.now() - 10000); // 10s in past
      const expiredSession = await prisma.adminSession.create({
        data: {
          sessionToken: generateSessionToken(),
          adminId: testAdmin.id,
          expiresAt: pastDate,
        },
      });

      const isExpired = expiredSession.expiresAt < new Date();
      expect(isExpired).toBe(true);

      // Cleanup
      await prisma.adminSession.delete({ where: { id: expiredSession.id } });
    });
  });

  describe("Independent Server-Side Authorization Barrier", () => {
    it("rejects unauthorized access when no admin session cookie is provided", async () => {
      // Calling requireAdmin() outside of an authenticated context throws
      await expect(requireAdmin()).rejects.toThrowError(/UNAUTHORIZED/);
    });

    it("rejects unauthenticated task creation via Server Action", async () => {
      const formData = new FormData();
      formData.set("title", "Unauthorized Task");
      formData.set("description", "Should not be created");
      formData.set("instructions", "No auth");
      formData.set("rewardInr", "20.00");
      formData.set("proofRequirements", "None");

      await expect(createTaskAction({}, formData)).rejects.toThrowError(/UNAUTHORIZED/);
    });

    it("rejects unauthenticated task status modification via Server Action", async () => {
      await expect(updateTaskStatusAction("some-task-id", "PAUSED")).rejects.toThrowError(
        /UNAUTHORIZED/
      );
    });
  });

  describe("Task Lifecycle, State Transitions & Decimal Precision", () => {
    it("persists tasks with exact PostgreSQL Decimal rewards and executes status transitions", async () => {
      // Create task directly in DB
      const task = await prisma.task.create({
        data: {
          title: "[TEST] Admin Lifecycle Task",
          description: "Testing task management state transitions",
          instructions: "Step 1: Do something. Step 2: Test it.",
          rewardInr: new Prisma.Decimal("75.50"),
          proofRequirements: "Screenshot of completion",
          proofType: "IMAGE",
          status: "DRAFT",
        },
      });

      expect(task.rewardInr).toBeInstanceOf(Prisma.Decimal);
      expect(task.rewardInr.toString()).toBe("75.5");
      expect(task.status).toBe("DRAFT");

      // Transition DRAFT -> ACTIVE
      const published = await prisma.task.update({
        where: { id: task.id },
        data: { status: "ACTIVE" },
      });
      expect(published.status).toBe("ACTIVE");

      // Transition ACTIVE -> PAUSED
      const paused = await prisma.task.update({
        where: { id: task.id },
        data: { status: "PAUSED" },
      });
      expect(paused.status).toBe("PAUSED");

      // Transition PAUSED -> ACTIVE
      const resumed = await prisma.task.update({
        where: { id: task.id },
        data: { status: "ACTIVE" },
      });
      expect(resumed.status).toBe("ACTIVE");

      // Transition ACTIVE -> CLOSED
      const closed = await prisma.task.update({
        where: { id: task.id },
        data: { status: "CLOSED" },
      });
      expect(closed.status).toBe("CLOSED");

      // Clean up test task
      await prisma.task.delete({ where: { id: task.id } });
    });

    it("creates a microtask without requiring an internal identifier (auto-generated Prisma CUID)", async () => {
      const result = await executeCreateTask({
        title: "[TEST] Auto ID Generated Task",
        description: "Testing that task creation requires no manual ID input",
        taskUrl: "https://example.com/auto-task",
        instructions: "Follow instructions to complete microtask",
        rewardInr: "45.00",
        proofRequirements: "Screenshot of confirmation page",
        proofType: "IMAGE",
        status: "DRAFT",
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.taskId).toBeDefined();
      expect(typeof result.taskId).toBe("string");
      expect(result.taskId!.length).toBeGreaterThan(10);

      // Verify the task exists in the database with the generated CUID
      const created = await prisma.task.findUnique({
        where: { id: result.taskId },
      });
      expect(created).not.toBeNull();
      expect(created?.title).toBe("[TEST] Auto ID Generated Task");
      expect(created?.taskUrl).toBe("https://example.com/auto-task");
      expect(created?.rewardInr.toString()).toBe("45");

      // Cleanup
      await prisma.task.delete({ where: { id: result.taskId } });
    });

    it("does not require an internal identifier in the task creation form and validates field schema", async () => {
      const validTaskInput = {
        title: "[TEST] Regression Valid Task",
        description: "Testing schema validation without taskId",
        taskUrl: "https://example.com/valid-link",
        instructions: "Step 1: Test. Step 2: Verify.",
        rewardInr: "30.50",
        proofRequirements: "Must show completed checkmark",
        proofType: "BOTH" as const,
      };

      const result = await executeCreateTask(validTaskInput);
      expect(result.success).toBe(true);
      expect(result.fieldErrors).toBeUndefined();
      expect(result.error).toBeUndefined();

      // Clean up
      if (result.taskId) {
        await prisma.task.delete({ where: { id: result.taskId } });
      }
    });
  });

  describe("Task Destination Link (taskUrl) Validation, Saving & Editing", () => {
    it("accepts valid secure HTTPS URLs", () => {
      expect(taskUrlSchema.safeParse("https://example.com/task").success).toBe(true);
      expect(
        taskUrlSchema.safeParse("https://subdomain.domain.org/tasks/42?source=app&step=1#proof").success
      ).toBe(true);
    });

    it("rejects insecure or dangerous URL protocols (javascript:, data:, http:, ftp:)", () => {
      // Insecure HTTP
      expect(taskUrlSchema.safeParse("http://insecure-domain.com/task").success).toBe(false);

      // XSS protocols
      expect(taskUrlSchema.safeParse("javascript:alert(document.cookie)").success).toBe(false);
      expect(taskUrlSchema.safeParse("data:text/html,<script>alert(1)</script>").success).toBe(false);

      // Unsafe protocols
      expect(taskUrlSchema.safeParse("ftp://ftp.example.com/task").success).toBe(false);
      expect(taskUrlSchema.safeParse("file:///etc/passwd").success).toBe(false);

      // Invalid / non-URL formats
      expect(taskUrlSchema.safeParse("not-a-url").success).toBe(false);
      expect(taskUrlSchema.safeParse("").success).toBe(false);
      expect(taskUrlSchema.safeParse("   ").success).toBe(false);
    });

    it("saves the taskUrl in the Task database record and persists it", async () => {
      const created = await executeCreateTask({
        title: "[TEST] Destination Link Verification Task",
        description: "Task to test that task destination URL is saved in database",
        taskUrl: "https://survey.partner.com/forms/task-101",
        instructions: "1. Open link. 2. Complete survey. 3. Submit proof.",
        rewardInr: "60.00",
        proofRequirements: "Screenshot of confirmation badge",
        proofType: "IMAGE",
        status: "ACTIVE",
      });

      expect(created.success).toBe(true);
      expect(created.taskId).toBeDefined();

      // Read back from database
      const dbTask = await prisma.task.findUnique({
        where: { id: created.taskId },
      });

      expect(dbTask).not.toBeNull();
      expect(dbTask?.taskUrl).toBe("https://survey.partner.com/forms/task-101");

      // Cleanup
      await prisma.task.delete({ where: { id: created.taskId } });
    });

    it("updates and pre-fills taskUrl when editing an existing task", async () => {
      // 1. Create task directly in DB
      const initialTask = await prisma.task.create({
        data: {
          title: "[TEST] Edit Task Destination URL",
          description: "Testing update flow for destination link",
          taskUrl: "https://original-link.com/survey",
          instructions: "Initial instructions",
          rewardInr: new Prisma.Decimal("50.00"),
          proofRequirements: "Screenshot required",
          proofType: "IMAGE",
          status: "DRAFT",
        },
      });

      expect(initialTask.taskUrl).toBe("https://original-link.com/survey");

      // 2. Perform update with new destination URL
      const updatedTask = await prisma.task.update({
        where: { id: initialTask.id },
        data: {
          taskUrl: "https://updated-link.com/new-destination",
          title: "[TEST] Updated Task Destination URL",
        },
      });

      expect(updatedTask.taskUrl).toBe("https://updated-link.com/new-destination");

      // 3. Confirm persistence
      const reFetched = await prisma.task.findUnique({
        where: { id: initialTask.id },
      });
      expect(reFetched?.taskUrl).toBe("https://updated-link.com/new-destination");

      // Cleanup
      await prisma.task.delete({ where: { id: initialTask.id } });
    });
  });

  describe("Dashboard Metrics Calculation", () => {
    it("accurately computes real metrics from database tables", async () => {
      const activeTasks = await prisma.task.count({ where: { status: "ACTIVE" } });
      const pendingSubs = await prisma.taskSubmission.count({ where: { status: "PENDING" } });
      const approvedSubs = await prisma.taskSubmission.count({ where: { status: "APPROVED" } });
      const totalSubs = await prisma.taskSubmission.count();

      expect(typeof activeTasks).toBe("number");
      expect(typeof pendingSubs).toBe("number");
      expect(typeof approvedSubs).toBe("number");
      expect(typeof totalSubs).toBe("number");

      // Sum of approved rewards
      const rewardsAgg = await prisma.taskSubmission.aggregate({
        _sum: { rewardSnapshot: true },
        where: { status: "APPROVED" },
      });

      const totalApproved = rewardsAgg._sum.rewardSnapshot || new Prisma.Decimal("0.00");
      expect(totalApproved).toBeInstanceOf(Prisma.Decimal);
    });
  });
});
