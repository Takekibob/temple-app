import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ApplyClient from "./ApplyClient";

export default async function EventApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const { id } = await params;
  const isDanka = authUser.member.type === "DANKA";

  const event = await prisma.event.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      _count: {
        select: { participations: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } } },
      },
    },
  });

  if (!event) notFound();

  // DANKA_ONLY は自寺院の檀家のみ（detail ページと同じチェック）
  if (event.visibility === "DANKA_ONLY") {
    const isMyTempleDanka = isDanka && authUser.member.templeId === event.templeId;
    if (!isMyTempleDanka) redirect("/app/events");
  }

  // Check existing participation
  const existing = await prisma.eventParticipation.findUnique({
    where: { eventId_memberId: { eventId: id, memberId: authUser.member.id } },
  });
  if (existing && existing.status !== "CANCELLED") {
    redirect(`/app/events/${id}`);
  }

  const isFull = event.capacity != null && event._count.participations >= event.capacity;

  return (
    <ApplyClient
      event={{
        id: event.id,
        title: event.title,
        eventDate: event.eventDate.toISOString(),
        startTime: event.startTime,
        endTime: event.endTime,
        fee: event.fee,
        capacity: event.capacity,
        participantCount: event._count.participations,
        isFull,
      }}
    />
  );
}
