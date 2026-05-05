import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/temples/[id]/posts — 特定寺院の投稿一覧
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const take = 20;

  const [posts, total] = await Promise.all([
    prisma.templePost.findMany({
      where: { templeId: id },
      include: {
        photos: { orderBy: { order: "asc" } },
        temple: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.templePost.count({ where: { templeId: id } }),
  ]);

  return NextResponse.json({ posts, total, page, pageSize: take });
}
