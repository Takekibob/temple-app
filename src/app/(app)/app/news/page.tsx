import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewsClient from "./NewsClient";

export default async function NewsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const memberId = authUser.member?.id ?? null;

  const announcements = await prisma.announcement.findMany({
    where: {
      templeId: authUser.templeId,
      publishedAt: { not: null, lte: new Date() },
      ...(memberId
        ? { reads: { none: { memberId, isDeleted: true } } }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      publishedAt: true,
      reads: memberId
        ? { where: { memberId }, select: { readAt: true } }
        : false,
    },
  });

  const items = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    publishedAt: a.publishedAt!.toISOString(),
    isRead: memberId ? (a.reads as { readAt: Date }[]).length > 0 : true,
  }));

  return <NewsClient announcements={items} hasMember={!!memberId} />;
}
