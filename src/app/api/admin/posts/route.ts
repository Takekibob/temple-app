import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/posts — 自寺院の投稿一覧
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const take = 20;

    const [posts, total] = await Promise.all([
      prisma.templePost.findMany({
        where: { templeId: authUser.templeId },
        include: {
          photos: { orderBy: { order: "asc" }, take: 1 },
          author: { select: { name: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
      prisma.templePost.count({ where: { templeId: authUser.templeId } }),
    ]);

    return NextResponse.json({ posts, total, page, pageSize: take });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST /api/admin/posts — 新規投稿作成
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();
    const body = await request.json();
    const { title, content, photos } = body as {
      title?: string;
      content: string;
      photos?: Array<{ url: string; caption?: string; order?: number }>;
    };

    if (!content?.trim()) {
      return NextResponse.json({ error: "本文を入力してください" }, { status: 400 });
    }

    const post = await prisma.templePost.create({
      data: {
        templeId: authUser.templeId,
        authorId: authUser.id,
        title: title?.trim() || null,
        body: content.trim(),
        photos: photos?.length
          ? {
              create: photos.slice(0, 4).map((p, i) => ({
                url: p.url,
                caption: p.caption?.trim() || null,
                order: p.order ?? i,
              })),
            }
          : undefined,
      },
      include: { photos: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
