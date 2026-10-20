import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/session";
import { getPrivateProofBuffer, StorageError } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  // 1. Independent Server-Side Authorization Barrier
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "UNAUTHORIZED: Administrator authentication required to view private proof." },
      { status: 401 }
    );
  }

  const { key } = params;

  // 2. Validate Storage Key Format to Prevent Path Traversal
  if (!key || !/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(key)) {
    return NextResponse.json(
      { error: "Invalid storage key format." },
      { status: 400 }
    );
  }

  // 3. IDOR Prevention: Verify that the proof file key is bound to a valid TaskSubmission
  const submission = await prisma.taskSubmission.findFirst({
    where: { proofFileKey: key },
    select: { id: true },
  });

  if (!submission) {
    return NextResponse.json(
      { error: "Proof file not associated with any submission." },
      { status: 404 }
    );
  }

  try {
    const { buffer, mimeType } = await getPrivateProofBuffer(key);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Content-Disposition": `inline; filename="${key}"`,
      },
    });
  } catch (error) {
    if (error instanceof StorageError && error.code === "FILE_NOT_FOUND") {
      return NextResponse.json({ error: "Proof file not found." }, { status: 404 });
    }

    console.error("Error retrieving private proof:", error);
    return NextResponse.json({ error: "Failed to retrieve proof file." }, { status: 500 });
  }
}
