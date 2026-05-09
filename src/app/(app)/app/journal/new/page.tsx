import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import JournalFormClient from "../JournalFormClient";

export default async function JournalNewPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const memberId = authUser.member.id;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const participations = await prisma.eventParticipation.findMany({
    where: {
      memberId,
      status: { in: ["APPLIED", "CONFIRMED"] },
      event: { eventDate: { gte: since } },
    },
    include: { event: { select: { id: true, title: true, eventDate: true } } },
    orderBy: { event: { eventDate: "desc" } },
    take: 20,
  });

  const recentEvents = participations.map((p) => ({
    id: p.event.id,
    title: p.event.title,
    eventDate: p.event.eventDate,
  }));

  return <JournalFormClient recentEvents={recentEvents} />;
}
