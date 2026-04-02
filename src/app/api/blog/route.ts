import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

export async function GET(request: NextRequest) {
  const authUser = await requireAuth();
  const { searchParams } = new URL(request.url);
  const includeSubscriberOnly = searchParams.get("all") === "1";

  // 管理者は全件取得可
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

  let isSubscriber = false;
  if (!isAdmin && authUser.member) {
    isSubscriber = await hasActiveSubscription(authUser.member.id, authUser.templeId);
  }

  const posts = await prisma.blogPost.findMany({
    where: {
      templeId: authUser.templeId,
      ...(isAdmin
        ? {}
        : {
            status: "PUBLISHED",
            publishedAt: { lte: new Date() },
            ...(isSubscriber ? {} : { isSubscriberOnly: false }),
          }),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      coverImageUrl: true,
      isSubscriberOnly: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      body: isAdmin || includeSubscriberOnly ? true : false,
    },
  });
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin();
  const body = await request.json();
  const { title, body: postBody, coverImageUrl, isSubscriberOnly, status } = body;

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const publishedAt = status === "PUBLISHED" ? new Date() : null;

  const post = await prisma.blogPost.create({
    data: {
      templeId: authUser.templeId,
      title,
      body: postBody ?? "",
      coverImageUrl: coverImageUrl ?? null,
      isSubscriberOnly: isSubscriberOnly ?? false,
      status: status ?? "DRAFT",
      publishedAt,
    },
  });
  return NextResponse.json({ post }, { status: 201 });
}
