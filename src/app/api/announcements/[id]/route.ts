import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAdmin, requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/announcements/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const memberType = authUser.member?.type ?? null;

    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        templeId: authUser.templeId,
        publishedAt: { not: null, lte: new Date() },
      },
    });

    if (!announcement) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // セグメントチェック
    const seg = announcement.targetSegment;
    if (seg === "DANKA" && memberType !== "DANKA") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (seg === "GOEN" && memberType !== "GOEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({ announcement });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PATCH /api/announcements/[id] — 管理者: 更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const existing = await prisma.announcement.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const { title, body: content, targetSegment, publish, unpublish } = body;

    const validSegments = ["ALL", "DANKA", "GOEN"];
    if (targetSegment && !validSegments.includes(targetSegment)) {
      return NextResponse.json({ error: "不正なセグメント値です" }, { status: 400 });
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title?.trim() && { title: title.trim() }),
        ...(content?.trim() && { body: content.trim() }),
        ...(targetSegment && { targetSegment }),
        ...(publish && { publishedAt: existing.publishedAt ?? new Date() }),
        ...(unpublish && { publishedAt: null }),
      },
    });

    return NextResponse.json({ announcement: updated });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/announcements/[id] — 管理者のみ: 削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.announcement.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.announcement.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
