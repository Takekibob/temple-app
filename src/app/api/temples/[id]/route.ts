import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/temples/[id] — 寺院プロフィール詳細
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const temple = await prisma.temple.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      denomination: true,
      address: true,
      phone: true,
      email: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
    },
  });

  if (!temple) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // この寺院の公開イベント（今後開催予定）
  const events = await prisma.event.findMany({
    where: {
      templeId: id,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      eventDate: { gte: new Date(new Date().toDateString()) },
    },
    select: {
      id: true,
      title: true,
      category: true,
      eventDate: true,
      startTime: true,
      fee: true,
    },
    orderBy: { eventDate: "asc" },
    take: 10,
  });

  return NextResponse.json({ temple, events });
}
