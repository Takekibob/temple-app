import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/memberships/[id] — ステータス・ステージ変更
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;
    const body = await request.json();
    const { status, currentStageId } = body;

    const membership = await prisma.membership.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.membership.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(currentStageId !== undefined && { currentStageId }),
      },
      include: {
        membershipType: { select: { id: true, name: true } },
        currentStage: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ membership: updated });
  } catch (err) {
    console.error("[PATCH /api/memberships/[id]]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/memberships/[id] — 解除（CHURNED に変更）
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const membership = await prisma.membership.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.membership.update({
      where: { id },
      data: { status: "CHURNED" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/memberships/[id]]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
