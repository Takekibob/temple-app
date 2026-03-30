import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

const VALID_RELATIONS = ["child", "grandchild", "spouse", "other"];

// POST /api/members/[id]/proxy — 家族代理アカウント設定
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const member = await prisma.member.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!member) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const { proxyUserId, proxyRelation } = body;

    if (!proxyUserId) {
      return NextResponse.json({ error: "proxyUserId は必須です" }, { status: 400 });
    }
    if (proxyRelation && !VALID_RELATIONS.includes(proxyRelation)) {
      return NextResponse.json({ error: "不正な proxyRelation 値です" }, { status: 400 });
    }

    // 代理ユーザーが同じお寺に属するか確認
    const proxyUser = await prisma.user.findFirst({
      where: { id: proxyUserId, templeId: authUser.templeId },
    });
    if (!proxyUser) {
      return NextResponse.json({ error: "代理ユーザーが見つかりません" }, { status: 404 });
    }
    // 自分自身への代理設定を防ぐ
    if (proxyUserId === member.userId) {
      return NextResponse.json({ error: "自分自身を代理ユーザーに設定できません" }, { status: 400 });
    }

    const updated = await prisma.member.update({
      where: { id },
      data: {
        proxyUserId,
        proxyRelation: proxyRelation ?? null,
      },
    });

    logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "update",
      targetType: "member",
      targetId: id,
      detail: { proxyUserId, proxyRelation, action: "proxy_set" },
    });

    return NextResponse.json({ member: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/members/[id]/proxy — 家族代理アカウント解除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const member = await prisma.member.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!member) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.member.update({
      where: { id },
      data: { proxyUserId: null, proxyRelation: null },
    });

    logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "update",
      targetType: "member",
      targetId: id,
      detail: { action: "proxy_removed" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
