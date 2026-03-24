import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ParticipantsClient from "./ParticipantsClient";

const CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅", SHAKYO: "写経", YOGA: "ヨガ",
  MINDFULNESS: "マインドフルネス", LECTURE: "仏事講座",
  SEASONAL: "季節行事", OTHER: "その他",
};

export default async function AdminEventParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, templeId: authUser.templeId },
    include: {
      participations: {
        include: {
          member: { include: { user: { select: { name: true, email: true, phone: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) notFound();

  const activeCount = event.participations.filter(
    (p) => !["CANCELLED", "WAITLISTED"].includes(p.status)
  ).reduce((sum, p) => sum + p.numGuests, 0);

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/admin/events" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← イベント管理
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-800">{event.title}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {CATEGORY_LABELS[event.category]} ·{" "}
            {event.eventDate.toLocaleDateString("ja-JP")} {event.startTime}〜{event.endTime}
          </p>
          <p className="text-sm text-stone-600 mt-1">
            参加者: {activeCount}名
            {event.capacity ? ` / ${event.capacity}名` : ""}
          </p>
        </div>
        <Link
          href={`/admin/events/${id}/edit`}
          className="text-sm text-amber-700 hover:underline"
        >
          イベントを編集
        </Link>
      </div>

      <ParticipantsClient
        eventId={id}
        initialParticipants={event.participations.map((p) => ({
          id: p.id,
          status: p.status,
          numGuests: p.numGuests,
          paymentStatus: p.paymentStatus,
          createdAt: p.createdAt.toISOString(),
          member: {
            familyName: p.member.familyName,
            user: {
              name: p.member.user.name,
              email: p.member.user.email,
              phone: p.member.user.phone,
            },
          },
        }))}
      />
    </div>
  );
}
