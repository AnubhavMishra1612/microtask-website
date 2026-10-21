import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, ADMIN_SESSION_COOKIE } from "@/lib/session";
import { executeDeleteTask } from "@/app/admin/tasks/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * DELETE /api/admin/tasks/[id]
 * Protected endpoint for permanently deleting a microtask.
 * Disallows GET or other methods for deletion.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Independent Server-Side Authorization Barrier
  let admin = await getCurrentAdmin();
  if (!admin) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (token) {
      const session = await prisma.adminSession.findUnique({
        where: { sessionToken: token },
        include: { admin: { select: { id: true, email: true, name: true } } },
      });
      if (session && session.expiresAt > new Date()) {
        admin = session.admin;
      }
    }
  }

  if (!admin) {
    return NextResponse.json(
      { error: "UNAUTHORIZED: Administrator authentication required." },
      { status: 401 }
    );
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json(
      { error: "Task identifier is required." },
      { status: 400 }
    );
  }

  // 2. Execute deletion
  const result = await executeDeleteTask(id);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.statusCode || 400 }
    );
  }

  return NextResponse.json({ success: true, message: "Task deleted successfully." }, { status: 200 });
}
