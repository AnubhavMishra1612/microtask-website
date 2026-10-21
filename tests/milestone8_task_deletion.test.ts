import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  executeDeleteTask,
  deleteTaskAction,
} from "../src/app/admin/tasks/actions";
import { DELETE as deleteTaskApiRoute } from "../src/app/api/admin/tasks/[id]/route";
import { NextRequest } from "next/server";
import { generateReferenceCode, generateSessionToken } from "../src/lib/reference";
import { executeReviewSubmission } from "../src/app/admin/submissions/actions";
import { savePrivateProof, getPrivateProofBuffer, StorageError } from "../src/lib/storage";

describe("Milestone 8: Admin Task Deletion & Relationship Safeguards", () => {
  let testAdmin: { id: string; email: string; name: string };
  let adminSessionToken: string;

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Ensure test admin exists
    let admin = await prisma.adminUser.findFirst({
      where: { email: "admin@microtask.local" },
    });
    if (!admin) {
      admin = await prisma.adminUser.create({
        data: {
          email: "admin@microtask.local",
          passwordHash: "test_hash",
          name: "Test Administrator",
        },
      });
    }
    testAdmin = admin;

    // Create admin session for API route testing
    adminSessionToken = generateSessionToken();
    await prisma.adminSession.create({
      data: {
        sessionToken: adminSessionToken,
        adminId: testAdmin.id,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
  });

  afterAll(async () => {
    await prisma.adminSession.deleteMany({
      where: { sessionToken: adminSessionToken },
    });
  });

  describe("Task Deletion Core Logic", () => {
    it("permanently deletes an existing task with zero submissions", async () => {
      const task = await prisma.task.create({
        data: {
          title: "Temporary Clean Task To Delete",
          description: "Task with no submissions.",
          instructions: "Test instructions.",
          rewardInr: new Prisma.Decimal("15.00"),
          proofRequirements: "None",
          status: "ACTIVE",
        },
      });

      const res = await executeDeleteTask(task.id);
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);

      // Verify task no longer exists in database
      const found = await prisma.task.findUnique({
        where: { id: task.id },
      });
      expect(found).toBeNull();
    });

    it("permanently deletes an already-closed task", async () => {
      const closedTask = await prisma.task.create({
        data: {
          title: "Closed Task To Delete",
          description: "Already closed task.",
          instructions: "Test instructions.",
          rewardInr: new Prisma.Decimal("20.00"),
          proofRequirements: "None",
          status: "CLOSED",
        },
      });

      const res = await executeDeleteTask(closedTask.id);
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);

      const found = await prisma.task.findUnique({
        where: { id: closedTask.id },
      });
      expect(found).toBeNull();
    });

    it("returns error 404 when attempting to delete a nonexistent task", async () => {
      const fakeId = "cmv_nonexistent_task_id_999";
      const res = await executeDeleteTask(fakeId);

      expect(res.success).toBeUndefined();
      expect(res.statusCode).toBe(404);
      expect(res.error).toContain("Task not found");
    });

    it("returns error 400 when task ID is empty or invalid", async () => {
      const res = await executeDeleteTask("");
      expect(res.success).toBeUndefined();
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("Invalid task identifier");
    });
  });

  describe("Relationship Safeguards & Submissions Handling", () => {
    it("blocks deletion when APPROVED submissions exist to preserve financial records", async () => {
      // 1. Create a task with an approved submission and earnings
      const taskWithApproved = await prisma.task.create({
        data: {
          title: "Task With Approved Earnings",
          description: "Must not be deleted due to financial ledger.",
          instructions: "Do not delete.",
          rewardInr: new Prisma.Decimal("50.00"),
          proofRequirements: "Screenshot",
          status: "ACTIVE",
        },
      });

      const sub = await prisma.taskSubmission.create({
        data: {
          taskId: taskWithApproved.id,
          submitterName: "Worker Ledger Test",
          contactInfo: "+919999988888",
          rewardSnapshot: new Prisma.Decimal("50.00"),
          referenceCode: generateReferenceCode(),
          status: "PENDING",
        },
      });

      // Approve submission and credit wallet
      const reviewRes = await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: sub.id,
        action: "APPROVED",
      });
      expect(reviewRes.success).toBe(true);

      // 2. Attempt to delete the task
      const deleteRes = await executeDeleteTask(taskWithApproved.id);

      // Must be blocked with 409 Conflict
      expect(deleteRes.success).toBeUndefined();
      expect(deleteRes.statusCode).toBe(409);
      expect(deleteRes.error).toContain("Cannot permanently delete task");
      expect(deleteRes.error).toContain("approved submission(s)");

      // Verify task still exists in DB
      const taskStillExists = await prisma.task.findUnique({
        where: { id: taskWithApproved.id },
      });
      expect(taskStillExists).not.toBeNull();
    });

    it("safely cleans up uploaded proof files and deletes task when only pending/rejected submissions exist", async () => {
      // 1. Create task
      const taskWithPending = await prisma.task.create({
        data: {
          title: "Task With Pending Submission",
          description: "Will be deleted along with its pending proof.",
          instructions: "Test.",
          rewardInr: new Prisma.Decimal("25.00"),
          proofRequirements: "Image",
          status: "ACTIVE",
        },
      });

      // 2. Save a dummy proof file in private storage
      const dummyBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
      ]);
      const stored = await savePrivateProof(dummyBuffer, "proof_screenshot.png");
      const savedStorageKey = stored.storageKey;

      // 3. Create a PENDING submission with this file key
      const sub = await prisma.taskSubmission.create({
        data: {
          taskId: taskWithPending.id,
          submitterName: "Pending Submitter",
          contactInfo: "+918888877777",
          proofFileKey: savedStorageKey,
          rewardSnapshot: new Prisma.Decimal("25.00"),
          referenceCode: generateReferenceCode(),
          status: "PENDING",
        },
      });

      // 4. Delete the task
      const deleteRes = await executeDeleteTask(taskWithPending.id);
      expect(deleteRes.success).toBe(true);

      // Verify task and submission are removed from database
      const taskInDb = await prisma.task.findUnique({
        where: { id: taskWithPending.id },
      });
      expect(taskInDb).toBeNull();

      const subInDb = await prisma.taskSubmission.findUnique({
        where: { id: sub.id },
      });
      expect(subInDb).toBeNull();
    });
  });

  describe("API Endpoint Security & Authorization", () => {
    it("rejects unauthorized DELETE requests with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/tasks/test-task-1", {
        method: "DELETE",
      });

      const res = await deleteTaskApiRoute(req, { params: { id: "test-task-1" } });
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toContain("UNAUTHORIZED");
    });

    it("successfully deletes task via DELETE API when authenticated", async () => {
      // Create a task to delete via API
      const task = await prisma.task.create({
        data: {
          title: "API Deletion Test Task",
          description: "Task to delete via REST API.",
          instructions: "Test.",
          rewardInr: new Prisma.Decimal("20.00"),
          proofRequirements: "None",
          status: "ACTIVE",
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/admin/tasks/${task.id}`, {
        method: "DELETE",
        headers: {
          cookie: `admin_session_token=${adminSessionToken}`,
        },
      });

      const res = await deleteTaskApiRoute(req, { params: { id: task.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify task removed from DB
      const found = await prisma.task.findUnique({ where: { id: task.id } });
      expect(found).toBeNull();
    });
  });
});
