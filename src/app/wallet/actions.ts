"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  createUserSession,
  getCurrentUser,
  requireUser,
  invalidateUserSession,
} from "@/lib/user-session";
import {
  createWithdrawalRequestAtomic,
  getOrCreateUserWallet,
  MIN_WITHDRAWAL_INR,
} from "@/lib/wallet";
import {
  userAuthSchema,
  withdrawalRequestSchema,
} from "@/lib/validations";

export interface UserAuthState {
  error?: string;
  fieldErrors?: {
    contactInfo?: string;
    password?: string;
    name?: string;
  };
  success?: boolean;
}

export interface WithdrawalActionState {
  error?: string;
  fieldErrors?: {
    realFullName?: string;
    upiId?: string;
    amount?: string;
  };
  success?: boolean;
  withdrawalId?: string;
}

/**
 * Worker Login Action
 */
export async function userLoginAction(
  prevState: UserAuthState,
  formData: FormData
): Promise<UserAuthState> {
  const headersList = headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const rateLimitKey = `user_login_ip_${ip}`;

  const rateCheck = await checkRateLimit({
    key: rateLimitKey,
    maxAttempts: 10,
    windowSeconds: 900, // 10 attempts per 15 minutes
  });

  if (!rateCheck.allowed) {
    return {
      error: "Too many login attempts. Access is temporarily restricted. Please try again in 15 minutes.",
    };
  }

  const contactInfo = (formData.get("contactInfo") as string)?.trim() || "";
  const password = (formData.get("password") as string)?.trim() || "";

  if (!contactInfo || contactInfo.length < 3) {
    return { fieldErrors: { contactInfo: "Please enter your valid phone number or email." } };
  }
  if (!password || password.length < 6) {
    return { fieldErrors: { password: "Password must be at least 6 characters." } };
  }

  const user = await prisma.user.findUnique({
    where: { contactInfo },
  });

  if (!user || !user.passwordHash) {
    return {
      error: "No account found with this contact info, or no password has been registered yet. Please click 'Create New Wallet' below.",
    };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return {
      error: "Invalid contact information or password. Please try again.",
    };
  }

  await createUserSession(user.id);
  await getOrCreateUserWallet(user.id);

  try {
    revalidatePath("/wallet");
  } catch {}

  return { success: true };
}

/**
 * Worker Register / Set Password Action
 */
export async function userRegisterAction(
  prevState: UserAuthState,
  formData: FormData
): Promise<UserAuthState> {
  const headersList = headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const rateLimitKey = `user_register_ip_${ip}`;

  const rateCheck = await checkRateLimit({
    key: rateLimitKey,
    maxAttempts: 10,
    windowSeconds: 900,
  });

  if (!rateCheck.allowed) {
    return {
      error: "Too many registration attempts. Please try again later.",
    };
  }

  const name = (formData.get("name") as string)?.trim() || "";
  const contactInfo = (formData.get("contactInfo") as string)?.trim() || "";
  const password = (formData.get("password") as string)?.trim() || "";

  const validation = userAuthSchema.safeParse({ name, contactInfo, password });
  if (!validation.success) {
    const fieldErrors: UserAuthState["fieldErrors"] = {};
    for (const issue of validation.error.issues) {
      const field = issue.path[0] as keyof NonNullable<UserAuthState["fieldErrors"]>;
      if (field) fieldErrors[field] = issue.message;
    }
    return {
      error: "Please correct the highlighted errors.",
      fieldErrors,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { contactInfo },
  });

  const passwordHash = await hashPassword(password);
  let userId: string;

  if (existingUser) {
    if (existingUser.passwordHash) {
      return {
        error: "An account with this contact info already exists. Please log in with your password.",
      };
    }
    // Account was created previously via task submission; set password and name
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: name || existingUser.name,
        passwordHash,
      },
    });
    userId = updated.id;
  } else {
    // Brand new user
    const newUser = await prisma.user.create({
      data: {
        name,
        contactInfo,
        passwordHash,
      },
    });
    userId = newUser.id;
  }

  // Ensure wallet exists
  await getOrCreateUserWallet(userId);

  // Link any orphaned task submissions matching this contactInfo
  await prisma.taskSubmission.updateMany({
    where: {
      contactInfo,
      userId: null,
    },
    data: {
      userId,
    },
  });

  await createUserSession(userId);

  try {
    revalidatePath("/wallet");
  } catch {}

  return { success: true };
}

/**
 * Worker Logout Action
 */
export async function userLogoutAction(): Promise<void> {
  await invalidateUserSession();
  try {
    revalidatePath("/wallet");
  } catch {}
  redirect("/wallet");
}

/**
 * Submit Withdrawal Request Action
 */
export async function requestWithdrawalAction(
  prevState: WithdrawalActionState,
  formData: FormData
): Promise<WithdrawalActionState> {
  const user = await requireUser();

  const realFullName = (formData.get("realFullName") as string)?.trim() || "";
  const upiId = (formData.get("upiId") as string)?.trim() || "";
  const rawAmount = (formData.get("amount") as string)?.trim() || "";

  const parsedAmount = parseFloat(rawAmount);

  // Validate inputs
  const validation = withdrawalRequestSchema.safeParse({
    realFullName,
    upiId,
    amountInr: parsedAmount,
  });

  if (!validation.success) {
    const fieldErrors: WithdrawalActionState["fieldErrors"] = {};
    for (const issue of validation.error.issues) {
      const field = issue.path[0];
      if (field === "realFullName") fieldErrors.realFullName = issue.message;
      if (field === "upiId") fieldErrors.upiId = issue.message;
      if (field === "amountInr") fieldErrors.amount = issue.message;
    }
    return {
      error: "Please fix the form errors before submitting.",
      fieldErrors,
    };
  }

  // Atomically process withdrawal and reserve balance
  const result = await createWithdrawalRequestAtomic({
    userId: user.id,
    realFullName,
    upiId,
    amountInr: parsedAmount,
  });

  if (!result.success) {
    return {
      error: result.error || "Failed to process withdrawal request.",
      fieldErrors: result.fieldErrors,
    };
  }

  try {
    revalidatePath("/wallet");
    revalidatePath("/admin/withdrawals");
  } catch {}

  return {
    success: true,
    withdrawalId: result.withdrawalId,
  };
}
