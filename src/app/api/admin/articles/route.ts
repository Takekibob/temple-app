import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/articleCategories";

// GET /api/admin/articles
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const isSuperAdmin = authUser.role === "SUPER_ADMIN";
    if (!["ADMIN", "STAFF", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const category = searchParams.get("category") ?? undefined;
    const take = 30;

    const where = {
      ...(isSuperAdmin ? {} : { templeId: authUser.templeId }),
      ...(category ? { category: category as never } : {}),
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        select: {
          id: true, slug: true, title: true, category: true, status: true,
          publishedAt: true, createdAt: true,
          temple: { select: { name: true } },
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({ articles, total, page, pageSize: take });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST /api/admin/articles
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const isSuperAdmin = authUser.role === "SUPER_ADMIN";
    if (!["ADMIN", "STAFF", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const { title, slug: rawSlug, excerpt, content, category, coverImage, templeId } = body as {
      title: string;
      slug?: string;
      excerpt: string;
      content: string;
      category: string;
      coverImage?: string;
      templeId?: string;
    };

    if (!title?.trim() || !excerpt?.trim() || !content?.trim() || !category) {
      return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
    }

    // slug 決定
    let slug = (rawSlug ?? generateSlug(title)).trim().replace(/\s+/g, "-");
    // 重複確認 → サフィックス付与
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const resolvedTempleId = isSuperAdmin ? (templeId ?? null) : authUser.templeId;

    const article = await prisma.article.create({
      data: {
        slug,
        title: title.trim(),
        excerpt: excerpt.trim(),
        body: content.trim(),
        category: category as never,
        authorId: authUser.id,
        templeId: resolvedTempleId,
        coverImage: coverImage ?? null,
      },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
