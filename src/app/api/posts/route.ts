import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/posts — フォロー寺院の投稿一覧(利用者向け)
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const take = 20;

  const memberId = authUser.member?.id ?? null;

  const followedTempleIds: string[] = memberId
    ? await prisma.memberFavoriteTemple
        .findMany({ where: { memberId }, select: { templeId: true } })
        .then((favs) => favs.map((f) => f.templeId))
    : [];

  const allTempleIds = Array.from(
    new Set([...(authUser.templeId ? [authUser.templeId] : []), ...followedTempleIds])
  );

  if (allTempleIds.length === 0) {
    return NextResponse.json({ posts: [], total: 0, page, pageSize: take });
  }

  const followedSet = new Set(followedTempleIds);

  const [posts, total] = await Promise.all([
    prisma.templePost.findMany({
      where: { templeId: { in: allTempleIds } },
      include: {
        photos: { orderBy: { order: "asc" } },
        temple: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.templePost.count({ where: { templeId: { in: allTempleIds } } }),
  ]);

  // フォロー中寺院を先頭に
  const sorted = [...posts].sort((a, b) => {
    const aF = followedSet.has(a.templeId) ? 0 : 1;
    const bF = followedSet.has(b.templeId) ? 0 : 1;
    return aF - bF || b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  return NextResponse.json({ posts: sorted, total, page, pageSize: take });
}
