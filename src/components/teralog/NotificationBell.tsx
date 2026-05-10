import Link from "next/link";
import { Bell } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 通知ベルアイコン。
 * 最新7日以内の未読お知らせが1件以上ある場合のみドット表示。
 * 件数は表示しない。
 */
export default async function NotificationBell() {
  const authUser = await getAuthUser();
  let hasDot = false;

  if (authUser?.member) {
    const memberId = authUser.member.id;
    const followedTempleIds = await prisma.memberFavoriteTemple
      .findMany({ where: { memberId }, select: { templeId: true } })
      .then((favs) => favs.map((f) => f.templeId));

    const allTempleIds = Array.from(
      new Set([
        ...(authUser.templeId ? [authUser.templeId] : []),
        ...followedTempleIds,
      ])
    );

    if (allTempleIds.length > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const count = await prisma.announcement.count({
        where: {
          templeId: { in: allTempleIds },
          publishedAt: { not: null, gte: sevenDaysAgo, lte: new Date() },
          reads: { none: { memberId } },
        },
      });
      hasDot = count > 0;
    }
  }

  return (
    <Link href="/app/news" className="relative p-1.5" aria-label="お知らせ">
      <Bell size={20} strokeWidth={1.6} className="text-ink-tertiary" />
      {hasDot && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-ink-secondary" />
      )}
    </Link>
  );
}
