import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// シンプルなインメモリ レート制限 (userId → [タイムスタンプ列])
const rateMap = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 60;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const prev = (rateMap.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_LIMIT) return true;
  rateMap.set(userId, [...prev, now]);
  return false;
}

// GET /api/temples/map
// ?north=&south=&east=&west=&denomination=&followingOnly=&limit=
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRateLimited(authUser.id)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const north = parseFloat(searchParams.get("north") ?? "");
  const south = parseFloat(searchParams.get("south") ?? "");
  const east = parseFloat(searchParams.get("east") ?? "");
  const west = parseFloat(searchParams.get("west") ?? "");
  const denomination = searchParams.get("denomination") ?? "";
  const followingOnly = searchParams.get("followingOnly") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 200);

  const hasBounds =
    !isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west);

  // フォロー中 ID
  let followedIds = new Set<string>();
  if (authUser.member) {
    const favs = await prisma.memberFavoriteTemple.findMany({
      where: { memberId: authUser.member.id },
      select: { templeId: true },
    });
    followedIds = new Set(favs.map((f) => f.templeId));
  }

  const where: Record<string, unknown> = {
    isActive: true,
    latitude: { not: null },
    longitude: { not: null },
    ...(denomination ? { denomination } : {}),
    ...(followingOnly ? { id: { in: Array.from(followedIds) } } : {}),
    ...(hasBounds
      ? {
          latitude: { gte: south, lte: north },
          longitude: { gte: west, lte: east },
        }
      : {}),
  };

  const temples = await prisma.temple.findMany({
    where,
    select: {
      id: true,
      name: true,
      denomination: true,
      address: true,
      prefecture: true,
      latitude: true,
      longitude: true,
      logoUrl: true,
    },
    take: limit,
    orderBy: { name: "asc" },
  });

  const result = temples.map((t) => ({
    id: t.id,
    name: t.name,
    denomination: t.denomination,
    address: t.address,
    prefecture: t.prefecture,
    latitude: Number(t.latitude),
    longitude: Number(t.longitude),
    logoUrl: t.logoUrl,
    isFollowing: followedIds.has(t.id),
  }));

  return NextResponse.json({ temples: result });
}
