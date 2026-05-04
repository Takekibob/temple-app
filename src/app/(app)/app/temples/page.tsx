import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NearbyTemplesClient from "./NearbyTemplesClient";

export default async function TemplesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; denomination?: string; search?: string }>;
}) {
  const { tab, denomination, search } = await searchParams;
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const myTempleId = authUser.member?.templeId ?? null;
  const memberId = authUser.member?.id ?? null;

  const where = {
    isActive: true,
    ...(denomination ? { denomination } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [temples, favorites, denominations] = await Promise.all([
    prisma.temple.findMany({
      where,
      select: {
        id: true,
        name: true,
        denomination: true,
        address: true,
        description: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { name: "asc" },
    }),
    memberId
      ? prisma.memberFavoriteTemple.findMany({
          where: { memberId },
          select: { templeId: true },
        })
      : Promise.resolve([]),
    // 宗派一覧（フィルタUI用）
    prisma.temple.findMany({
      where: { isActive: true, denomination: { not: null } },
      select: { denomination: true },
      distinct: ["denomination"],
      orderBy: { denomination: "asc" },
    }).then((rows) => rows.map((r) => r.denomination!).filter(Boolean)),
  ]);

  const favoriteIds = new Set(favorites.map((f) => f.templeId));

  const templeItems = temples.map((t) => ({
    id: t.id,
    name: t.name,
    denomination: t.denomination,
    address: t.address,
    description: t.description,
    latitude: t.latitude != null ? Number(t.latitude) : null,
    longitude: t.longitude != null ? Number(t.longitude) : null,
    isMyTemple: t.id === myTempleId,
    isFavorite: favoriteIds.has(t.id),
  }));

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="px-5 pt-6 pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">お寺を探す</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            フォローするとイベントやお知らせが届きます
          </p>
        </div>
        {/* リスト/地図 切替 */}
        <div className="flex items-center gap-0 mb-1">
          <span className="px-4 py-1.5 font-serif text-[12px] font-light text-ink border-[0.5px] border-ink tracking-section bg-paper-soft">
            リスト
          </span>
          <Link
            href="/app/temples/map"
            className="px-4 py-1.5 font-serif text-[12px] font-light text-ink-tertiary border-[0.5px] border-border tracking-section"
          >
            地 図
          </Link>
        </div>
      </div>

      <div className="px-4">
        <NearbyTemplesClient
          temples={templeItems}
          hasMember={!!memberId}
          initialTab={tab === "following" ? "following" : "all"}
          denominations={denominations}
          initialDenomination={denomination ?? ""}
          initialSearch={search ?? ""}
        />
      </div>
    </div>
  );
}
