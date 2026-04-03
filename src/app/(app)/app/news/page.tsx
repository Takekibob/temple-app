import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTarget } from "@/generated/prisma/enums";
import NewsClient from "./NewsClient";

export default async function NewsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const memberType = authUser.member?.type ?? null;
  const memberId = authUser.member?.id ?? null;

  const allowedSegments: AnnouncementTarget[] = memberType === "DANKA"
    ? ["ALL", "DANKA"]
    : memberType === "GOEN"
    ? ["ALL", "GOEN"]
    : ["ALL"];

  const announcements = await prisma.announcement.findMany({
    where: {
      templeId: authUser.templeId,
      publishedAt: { not: null, lte: new Date() },
      OR: [
        { memberId: null, targetSegment: { in: allowedSegments } },
        ...(memberId ? [{ memberId }] : []),
      ],
      ...(memberId
        ? {
            reads: {
              none: { memberId, isDeleted: true },
            },
          }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      targetSegment: true,
      memberId: true,
      publishedAt: true,
      reads: memberId
        ? { where: { memberId }, select: { readAt: true } }
        : false,
    },
  });

  const items = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    targetSegment: a.targetSegment,
    memberId: a.memberId,
    publishedAt: a.publishedAt!.toISOString(),
    isRead: memberId ? (a.reads as { readAt: Date }[]).length > 0 : true,
  }));

  return <NewsClient announcements={items} hasMember={!!memberId} />;
}
