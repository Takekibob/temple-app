import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST() {
  const authUser = await requireAdmin();

  const page = await prisma.templePage.findUnique({
    where: { templeId: authUser.templeId },
  });

  if (!page) {
    return NextResponse.json({ error: "LP未作成。先にPUTで作成してください" }, { status: 404 });
  }

  const updated = await prisma.templePage.update({
    where: { templeId: authUser.templeId },
    data: {
      isPublished: !page.isPublished,
      publishedAt: !page.isPublished ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}
