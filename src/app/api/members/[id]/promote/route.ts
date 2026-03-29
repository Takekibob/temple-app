import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/members/[id]/promote — ご縁さんを檀家に昇格
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdmin();
    const { id } = await params;

    const member = await prisma.member.findFirst({
      where: { id, templeId: authUser.templeId },
    });

    if (!member) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (member.type === "DANKA") {
      return NextResponse.json({ error: "既に檀家です" }, { status: 400 });
    }

    const updated = await prisma.member.update({
      where: { id },
      data: { type: "DANKA", promotedAt: new Date() },
    });

    return NextResponse.json({ member: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
