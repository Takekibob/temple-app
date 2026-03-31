import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logFeature } from "@/lib/featureLog";

// PATCH /api/members/[id]/notes/[nid] — メモ更新（編集・ピン・完了）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nid: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const { nid } = await params;

    const note = await prisma.memberNote.findFirst({
      where: { id: nid, templeId: authUser.templeId },
    });
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { title, content, tags, followupDate, isPinned, isResolved, noteType } = body;

    // アクション種別を判定してログ
    const logAction =
      isPinned !== undefined && Object.keys(body).length === 1 ? "pin" :
      isResolved !== undefined && Object.keys(body).length === 1 ? "resolve" :
      "edit";
    void logFeature(authUser.templeId, authUser.id, "member_notes", logAction);

    const updated = await prisma.memberNote.update({
      where: { id: nid },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(tags !== undefined && { tags }),
        ...(followupDate !== undefined && { followupDate: followupDate ? new Date(followupDate) : null }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isResolved !== undefined && { isResolved }),
        ...(noteType !== undefined && { noteType }),
      },
      include: { author: { select: { name: true } } },
    });

    return NextResponse.json({ note: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/members/[id]/notes/[nid] — メモ削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; nid: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const { nid } = await params;

    const note = await prisma.memberNote.findFirst({
      where: { id: nid, templeId: authUser.templeId },
    });
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.memberNote.delete({ where: { id: nid } });
    void logFeature(authUser.templeId, authUser.id, "member_notes", "delete");
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
