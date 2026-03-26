import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function findDeceased(id: string, templeId: string) {
  return prisma.deceasedPerson.findFirst({
    where: { id, member: { templeId } },
    include: { member: { include: { user: { select: { name: true } } } } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;
    const deceased = await findDeceased(id, authUser.templeId);
    if (!deceased) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ deceased });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await findDeceased(id, authUser.templeId);
    if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const body = await request.json();
    const { memberId, name, kaimyo, deathDate, age, relationship, notes } = body;

    if (name !== undefined && name.length > 50) {
      return NextResponse.json({ error: "故人名は50文字以内で入力してください" }, { status: 400 });
    }
    if (kaimyo && kaimyo.length > 100) {
      return NextResponse.json({ error: "戒名は100文字以内で入力してください" }, { status: 400 });
    }
    if (deathDate) {
      const d = new Date(deathDate);
      if (d > new Date()) {
        return NextResponse.json({ error: "没年月日に未来の日付は指定できません" }, { status: 400 });
      }
    }

    // memberId が変わる場合は temple の檀家か確認
    if (memberId && memberId !== existing.memberId) {
      const member = await prisma.member.findFirst({
        where: { id: memberId, templeId: authUser.templeId, type: "DANKA" },
      });
      if (!member) {
        return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
      }
    }

    const updated = await prisma.deceasedPerson.update({
      where: { id },
      data: {
        ...(memberId !== undefined ? { memberId } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(kaimyo !== undefined ? { kaimyo: kaimyo || null } : {}),
        ...(deathDate !== undefined ? { deathDate: deathDate ? new Date(deathDate) : null } : {}),
        ...(age !== undefined ? { age: age !== "" ? parseInt(age) : null } : {}),
        ...(relationship !== undefined ? { relationship: relationship || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
    });

    return NextResponse.json({ deceased: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await findDeceased(id, authUser.templeId);
    if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await prisma.deceasedPerson.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
