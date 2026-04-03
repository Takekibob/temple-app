import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser?.member) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id: postId } = await params;

  const post = await prisma.blogPost.findFirst({
    where: { id: postId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await prisma.blogLike.upsert({
    where: { postId_memberId: { postId, memberId: authUser.member.id } },
    update: {},
    create: { postId, memberId: authUser.member.id },
  });

  const count = await prisma.blogLike.count({ where: { postId } });
  return NextResponse.json({ liked: true, count });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser?.member) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id: postId } = await params;

  await prisma.blogLike.deleteMany({
    where: { postId, memberId: authUser.member.id },
  });

  const count = await prisma.blogLike.count({ where: { postId } });
  return NextResponse.json({ liked: false, count });
}
