import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewsClient from "./NewsClient";

export default async function NewsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const memberId = authUser.member?.id ?? null;

  // フォロー中の寺院ID取得
  const followedTempleIds: string[] = memberId
    ? await prisma.memberFavoriteTemple
        .findMany({ where: { memberId }, select: { templeId: true } })
        .then((favs) => favs.map((f) => f.templeId))
    : [];

  const allTempleIds = Array.from(
    new Set([...(authUser.templeId ? [authUser.templeId] : []), ...followedTempleIds])
  );

  if (allTempleIds.length === 0) {
    return <NewsClient announcements={[]} hasMember={!!memberId} />;
  }

  const announcements = await prisma.announcement.findMany({
    where: {
      templeId: { in: allTempleIds },
      publishedAt: { not: null, lte: new Date() },
      ...(memberId ? { reads: { none: { memberId, isDeleted: true } } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      publishedAt: true,
      templeId: true,
      reads: memberId
        ? { where: { memberId }, select: { readAt: true } }
        : false,
    },
  });

  // フォロー寺院のお知らせを先頭に（publishedAt descの順を維持）
  const followedSet = new Set(followedTempleIds);
  const sorted = [...announcements].sort((a, b) => {
    const aP = followedSet.has(a.templeId) ? 0 : 1;
    const bP = followedSet.has(b.templeId) ? 0 : 1;
    return aP - bP;
  });

  const items = sorted.map((a) => ({
    id: a.id,
    title: a.title,
    publishedAt: a.publishedAt!.toISOString(),
    isRead: memberId ? (a.reads as { readAt: Date }[]).length > 0 : true,
  }));

  return <NewsClient announcements={items} hasMember={!!memberId} />;
}
