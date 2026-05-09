import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function getArticleOrFail(id: string, authorId: string, isSuperAdmin: boolean) {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return null;
  if (!isSuperAdmin && article.authorId !== authorId) return null;
  return article;
}

// PATCH /api/admin/articles/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authUser = await requireAuth();
    const isSuperAdmin = authUser.role === "SUPER_ADMIN";
    if (!["ADMIN", "STAFF", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getArticleOrFail(id, authUser.id, isSuperAdmin);
    if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const body = await request.json();
    const { title, excerpt, content, category, coverImage, status, templeId } = body as {
      title?: string;
      excerpt?: string;
      content?: string;
      category?: string;
      coverImage?: string;
      status?: string;
      templeId?: string;
    };

    const publishedAt =
      status === "PUBLISHED" && !existing.publishedAt ? new Date() :
      status === "DRAFT" ? null :
      undefined;

    const article = await prisma.article.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(excerpt !== undefined ? { excerpt: excerpt.trim() } : {}),
        ...(content !== undefined ? { body: content.trim() } : {}),
        ...(category !== undefined ? { category: category as never } : {}),
        ...(coverImage !== undefined ? { coverImage } : {}),
        ...(status !== undefined ? { status: status as never } : {}),
        ...(publishedAt !== undefined ? { publishedAt } : {}),
        ...(templeId !== undefined && isSuperAdmin ? { templeId } : {}),
      },
    });

    return NextResponse.json({ article });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/admin/articles/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authUser = await requireAuth();
    const isSuperAdmin = authUser.role === "SUPER_ADMIN";
    if (!["ADMIN", "STAFF", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getArticleOrFail(id, authUser.id, isSuperAdmin);
    if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await prisma.article.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
