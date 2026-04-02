import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAuth();
  const { id } = await params;

  const post = await prisma.blogPost.findFirst({
    where: { id, templeId: authUser.templeId },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
  if (!isAdmin) {
    if (post.status !== "PUBLISHED") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.isSubscriberOnly && authUser.member) {
      const ok = await hasActiveSubscription(authUser.member.id, authUser.templeId);
      if (!ok) return NextResponse.json({ error: "SUBSCRIBERS_ONLY" }, { status: 403 });
    }
  }

  return NextResponse.json({ post });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;

  const post = await prisma.blogPost.findFirst({ where: { id, templeId: authUser.templeId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const ALLOWED = ["title", "body", "coverImageUrl", "isSubscriberOnly", "status"];
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key];
  }

  // 公開に変更するとき publishedAt を設定
  if (body.status === "PUBLISHED" && post.status !== "PUBLISHED") {
    data.publishedAt = new Date();
  }

  const updated = await prisma.blogPost.update({ where: { id }, data });
  return NextResponse.json({ post: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;

  const post = await prisma.blogPost.findFirst({ where: { id, templeId: authUser.templeId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.blogPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
