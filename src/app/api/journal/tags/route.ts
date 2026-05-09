import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/journal/tags — 自分が使ったタグ一覧（サジェスト用）
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const journals = await prisma.journal.findMany({
    where: { userId: authUser.id },
    select: { tags: true },
  });

  const tagCounts = new Map<string, number>();
  for (const j of journals) {
    for (const tag of j.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const tags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  return NextResponse.json({ tags });
}
