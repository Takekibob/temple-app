import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logFeature } from "@/lib/featureLog";

// GET /api/members/[id]/notes — メモ一覧取得
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const { id: memberId } = await params;

    const notes = await prisma.memberNote.findMany({
      where: { memberId, templeId: authUser.templeId },
      include: { author: { select: { name: true } } },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ notes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/members/[id]/notes — メモ作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const { id: memberId } = await params;

    // 同じ寺院の会員か確認
    const member = await prisma.member.findFirst({
      where: { id: memberId, templeId: authUser.templeId },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { noteType, title, content, tags, followupDate, isPinned } = await request.json();
    if (!content) return NextResponse.json({ error: "内容を入力してください" }, { status: 400 });

    const note = await prisma.memberNote.create({
      data: {
        memberId,
        templeId: authUser.templeId,
        authorId: authUser.id,
        noteType: noteType ?? "MEMO",
        title: title ?? null,
        content,
        tags: tags ?? [],
        followupDate: followupDate ? new Date(followupDate) : null,
        isPinned: isPinned ?? false,
      },
      include: { author: { select: { name: true } } },
    });

    // INTERACTION メモ作成時は lastContactAt を更新
    if ((noteType ?? "MEMO") === "INTERACTION") {
      void prisma.member.update({ where: { id: memberId }, data: { lastContactAt: new Date() } });
    }

    void logFeature(authUser.templeId, authUser.id, "member_notes", "create");
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
