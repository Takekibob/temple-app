import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/articles — 公開記事一覧(認証不要)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const category = searchParams.get("category") ?? undefined;
  const take = 20;

  const where = {
    status: "PUBLISHED" as const,
    ...(category ? { category: category as never } : {}),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      select: {
        id: true, slug: true, title: true, excerpt: true, category: true,
        coverImage: true, publishedAt: true,
        temple: { select: { id: true, name: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({ articles, total, page, pageSize: take });
}
