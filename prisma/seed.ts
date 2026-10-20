import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting idempotent database seeding...");

  const isProduction = process.env.NODE_ENV === "production";
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || "admin@microtask.local").trim().toLowerCase();
  const rawAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || "AdminPassword123!";

  // 1. Production safety check
  if (isProduction) {
    if (
      rawAdminPassword.includes("AdminPassword") ||
      rawAdminPassword.includes("ChangeMe") ||
      rawAdminPassword.length < 12
    ) {
      throw new Error(
        "FATAL: Insecure or default administrative password detected in production environment. " +
          "Provide a strong, unique INITIAL_ADMIN_PASSWORD with at least 12 characters."
      );
    }
  }

  // 2. Admin User Seeding (Idempotent: NEVER overwrite existing password)
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`ℹ️ Admin user (${adminEmail}) already exists. Preserving existing password and credentials.`);
  } else {
    const passwordHash = await bcrypt.hash(rawAdminPassword, 12);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "Platform Administrator",
      },
    });
    console.log(`✅ Initial admin account created successfully (${adminEmail}).`);
  }

  // 3. Clearly labeled [DEMO] Tasks (Idempotent upsert by title)
  const demoTasks = [
    {
      title: "[DEMO] Complete Mobile App Usability Survey",
      description: "Answer a 3-minute sample feedback survey about mobile microtask interfaces and navigation.",
      instructions:
        "1. Read each question carefully.\n2. Submit your authentic impressions on font size and button placement.\n3. Copy the confirmation code shown at the end of the survey and paste it in proof text.",
      rewardInr: new Prisma.Decimal("25.00"),
      proofRequirements: "Enter the unique 6-digit confirmation code shown at the end of the survey.",
      proofType: "TEXT" as const,
      status: "ACTIVE" as const,
    },
    {
      title: "[DEMO] Test Checkout Flow & Screenshot Confirmation",
      description: "Perform a simulated UPI checkout on our test store and upload a screenshot of the receipt screen.",
      instructions:
        "1. Open the demo test checkout link.\n2. Select Demo UPI.\n3. Complete the mock payment (no real money involved).\n4. Capture a full-screen screenshot showing the green Success checkmark and transaction ID.",
      rewardInr: new Prisma.Decimal("40.00"),
      proofRequirements: "Upload a clear screenshot showing the successful demo payment confirmation screen.",
      proofType: "IMAGE" as const,
      status: "ACTIVE" as const,
    },
    {
      title: "[DEMO] Social Discussion Group Introduction",
      description: "Join the official discussion group on Telegram, say hi to the community, and provide proof.",
      instructions:
        "1. Click the Telegram button in the bottom right corner.\n2. Join our official community discussion.\n3. Send an introductory message introducing yourself.\n4. Enter your Telegram @username and upload a screenshot of your message.",
      rewardInr: new Prisma.Decimal("15.00"),
      proofRequirements: "Provide your Telegram username in proof text and upload a screenshot showing your chat message.",
      proofType: "BOTH" as const,
      status: "ACTIVE" as const,
    },
    {
      title: "[DEMO] Paused Task Demonstration",
      description: "This is a demonstration of a task that has reached its temporary limit and is paused.",
      instructions: "This task is currently paused. Submissions cannot be made until reopened by an administrator.",
      rewardInr: new Prisma.Decimal("50.00"),
      proofRequirements: "No submissions are currently accepted for this demonstration task.",
      proofType: "TEXT" as const,
      status: "PAUSED" as const,
    },
  ];

  for (const task of demoTasks) {
    const existing = await prisma.task.findFirst({
      where: { title: task.title },
    });

    if (existing) {
      console.log(`ℹ️ Task "${task.title}" already exists. Skipping.`);
    } else {
      await prisma.task.create({
        data: task,
      });
      console.log(`✅ Created demo task: "${task.title}" (Reward: ₹${task.rewardInr})`);
    }
  }

  // 4. Site Settings (Telegram URL)
  const defaultTelegramUrl = process.env.DEFAULT_TELEGRAM_URL || "https://t.me/demo_microtask_channel";
  await prisma.siteSetting.upsert({
    where: { key: "telegram_url" },
    create: {
      key: "telegram_url",
      value: defaultTelegramUrl,
    },
    update: {
      // Preserve existing value if already set
    },
  });
  console.log(`✅ Site setting for Telegram configured.`);

  console.log("🎉 Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
