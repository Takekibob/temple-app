import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/favorites/temples — お気に入り寺院一覧
export async function GET() {
  try {
    const authUser = await requireAuth();
    if (!authUser.member) {
      return NextResponse.json({ favorites: [] });
    }

    const favorites = await prisma.memberFavoriteTemple.findMany({
      where: { memberId: authUser.member.id },
      include: {
        temple: {
          select: { id: true, name: true, denomination: true, address: true, logoUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ favorites: favorites.map((f) => f.temple) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/favorites/temples — お気に入り追加
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    if (!authUser.member) {
      return NextResponse.json({ error: "MEMBER_REQUIRED" }, { status: 403 });
    }

    const { templeId } = await request.json();
    if (!templeId) {
      return NextResponse.json({ error: "templeId is required" }, { status: 400 });
    }

    const temple = await prisma.temple.findFirst({ where: { id: templeId, isActive: true } });
    if (!temple) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.memberFavoriteTemple.upsert({
      where: { memberId_templeId: { memberId: authUser.member.id, templeId } },
      create: { memberId: authUser.member.id, templeId },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
