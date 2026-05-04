import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TempleMapClient from "./TempleMapClient";

export default async function TempleMapPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const memberId = authUser.member?.id ?? null;

  const [favorites, denominations] = await Promise.all([
    memberId
      ? prisma.memberFavoriteTemple.findMany({
          where: { memberId },
          select: { templeId: true },
        })
      : Promise.resolve([]),
    prisma.temple.findMany({
      where: { isActive: true, denomination: { not: null } },
      select: { denomination: true },
      distinct: ["denomination"],
      orderBy: { denomination: "asc" },
    }).then((rows) => rows.map((r) => r.denomination!)),
  ]);

  const followedIds = favorites.map((f) => f.templeId);

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      {/* ページヘッダー */}
      <div className="flex items-center gap-4 px-6 py-4 bg-paper" style={{ borderBottom: "0.5px solid #E5E5E5" }}>
        <h1 className="font-serif text-base text-ink font-light flex-1">
          お寺をさがす
        </h1>
        <div className="flex items-center gap-0">
          <Link
            href="/app/temples"
            className="px-4 py-1.5 font-serif text-[12px] font-light text-ink-tertiary border-[0.5px] border-border tracking-section"
          >
            リスト
          </Link>
          <span className="px-4 py-1.5 font-serif text-[12px] font-light text-ink border-[0.5px] border-ink tracking-section bg-paper-soft">
            地 図
          </span>
        </div>
      </div>

      {/* 地図クライアント */}
      <div className="flex-1 overflow-hidden">
        <TempleMapClient initialFollowedIds={followedIds} denominations={denominations} />
      </div>
    </div>
  );
}
