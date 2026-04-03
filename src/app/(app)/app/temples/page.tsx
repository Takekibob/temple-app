import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NearbyTemplesClient from "./NearbyTemplesClient";

export default async function TemplesPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const myTempleId = authUser.member?.templeId ?? null;

  const temples = await prisma.temple.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      denomination: true,
      address: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { name: "asc" },
  });

  const templeItems = temples.map((t) => ({
    id: t.id,
    name: t.name,
    denomination: t.denomination,
    address: t.address,
    // Decimal → number 変換
    latitude: t.latitude != null ? Number(t.latitude) : null,
    longitude: t.longitude != null ? Number(t.longitude) : null,
    isMyTemple: t.id === myTempleId,
  }));

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">近くの寺院</h1>
        <p className="text-xs text-stone-400 mt-0.5">位置情報を許可すると距離順に表示されます</p>
      </div>

      <div className="px-4">
        <NearbyTemplesClient temples={templeItems} />
      </div>
    </div>
  );
}
