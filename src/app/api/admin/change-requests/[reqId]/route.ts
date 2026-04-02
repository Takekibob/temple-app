import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/change-requests/[reqId] — 承認 or 却下
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reqId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { reqId } = await params;
    const body = await request.json();
    const { action, rejectedReason } = body; // action: "approve" | "reject"

    const changeRequest = await prisma.memberChangeRequest.findUnique({
      where: { id: reqId },
      include: { member: true },
    });

    if (!changeRequest) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // 同じお寺のリクエストのみ処理
    if (changeRequest.templeId !== authUser.templeId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (changeRequest.status !== "PENDING") {
      return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });
    }

    if (action === "approve") {
      const data = changeRequest.requestData as Record<string, string>;

      // Memberレコードを更新
      await prisma.member.update({
        where: { id: changeRequest.memberId },
        data: {
          ...(data.familyName !== undefined && { familyName: data.familyName }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email !== undefined && { email: data.email }),
        },
      });

      await prisma.memberChangeRequest.update({
        where: { id: reqId },
        data: { status: "APPROVED", reviewedBy: authUser.id, reviewedAt: new Date() },
      });

      return NextResponse.json({ ok: true, status: "APPROVED" });
    } else if (action === "reject") {
      await prisma.memberChangeRequest.update({
        where: { id: reqId },
        data: {
          status: "REJECTED",
          reviewedBy: authUser.id,
          reviewedAt: new Date(),
          rejectedReason: rejectedReason ?? null,
        },
      });

      return NextResponse.json({ ok: true, status: "REJECTED" });
    }

    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
