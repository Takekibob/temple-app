import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NearbyTemplesClient from "./NearbyTemplesClient";

export default async function TemplesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const myTempleId = authUser.member?.templeId ?? null;
  const memberId = authUser.member?.id ?? null;

  const [temples, favorites] = await Promise.all([
    prisma.temple.findMany({
      where: { isActive: true },
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
      : [],
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
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">お寺を探す</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          フォローするとイベント・ブログが届きます
        </p>
      </div>

      <div className="px-4">
        <NearbyTemplesClient
          temples={templeItems}
          hasMember={!!memberId}
          initialTab={tab === "following" ? "following" : "all"}
        />
      </div>
    </div>
  );
}
