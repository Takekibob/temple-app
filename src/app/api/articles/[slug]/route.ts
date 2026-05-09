import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/articles/[slug]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const article = await prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: { select: { name: true } },
      temple: { select: { id: true, name: true } },
    },
  });

  if (!article) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // 関連記事(同カテゴリ・最新3件・自身除く)
  const related = await prisma.article.findMany({
    where: { category: article.category, status: "PUBLISHED", id: { not: article.id } },
    select: { slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return NextResponse.json({ article, related });
}
