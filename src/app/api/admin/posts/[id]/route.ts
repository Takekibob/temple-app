import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const BUCKET = "temple-posts";

// PATCH /api/admin/posts/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const existing = await prisma.templePost.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const body = await request.json();
    const { title, content, photos } = body as {
      title?: string;
      content?: string;
      photos?: Array<{ url: string; caption?: string; order?: number }>;
    };

    const post = await prisma.templePost.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() || null } : {}),
        ...(content !== undefined ? { body: content.trim() } : {}),
        ...(photos !== undefined
          ? {
              photos: {
                deleteMany: {},
                create: photos.slice(0, 4).map((p, i) => ({
                  url: p.url,
                  caption: p.caption?.trim() || null,
                  order: p.order ?? i,
                })),
              },
            }
          : {}),
      },
      include: { photos: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ post });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/admin/posts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const existing = await prisma.templePost.findFirst({
      where: { id, templeId: authUser.templeId },
      include: { photos: true },
    });
    if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // Storage から写真を削除
    if (existing.photos.length > 0) {
      const supabase = createAdminSupabaseClient();
      const paths = existing.photos
        .map((p) => {
          const url = new URL(p.url);
          // /storage/v1/object/public/temple-posts/{path}
          const prefix = `/storage/v1/object/public/${BUCKET}/`;
          return url.pathname.startsWith(prefix)
            ? decodeURIComponent(url.pathname.slice(prefix.length))
            : null;
        })
        .filter(Boolean) as string[];

      if (paths.length > 0) {
        await supabase.storage.from(BUCKET).remove(paths);
      }
    }

    await prisma.templePost.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
