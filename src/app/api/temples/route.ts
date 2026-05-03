import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/temples — アクティブな寺院一覧（認証不要・オンボーディング用）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const denomination = searchParams.get("denomination");
  const prefecture = searchParams.get("prefecture");

  const where: Record<string, unknown> = { isActive: true };
  if (denomination) where.denomination = denomination;

  const temples = await prisma.temple.findMany({
    where,
    select: {
      id: true,
      name: true,
      denomination: true,
      address: true,
      phone: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
    },
    orderBy: { name: "asc" },
  });

  // text + prefecture filter in memory (schema lacks prefecture field)
  const filtered = temples.filter((t) => {
    if (prefecture && !(t.address ?? "").includes(prefecture)) return false;
    if (search) {
      return (
        t.name.includes(search) ||
        (t.denomination ?? "").includes(search) ||
        (t.address ?? "").includes(search)
      );
    }
    return true;
  });

  // isFollowing — optional auth
  const authUser = await getAuthUser();
  let followedIds = new Set<string>();
  if (authUser?.member) {
    const favs = await prisma.memberFavoriteTemple.findMany({
      where: { memberId: authUser.member.id },
      select: { templeId: true },
    });
    followedIds = new Set(favs.map((f) => f.templeId));
  }

  const result = filtered.map((t) => ({
    ...t,
    isFollowing: followedIds.has(t.id),
  }));

  return NextResponse.json({ temples: result });
}
