import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EditReservationClient from "./EditReservationClient";

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser?.member) redirect("/");
  if (authUser.member.type !== "DANKA") redirect("/app");

  const { id } = await params;

  const reservation = await prisma.reservation.findFirst({
    where: { id, memberId: authUser.member.id },
    include: { deceasedPerson: { select: { id: true, name: true } } },
  });

  if (!reservation) notFound();
  if (reservation.status !== "PENDING") redirect("/app/reservations");

  const deceasedPersons = await prisma.deceasedPerson.findMany({
    where: { memberId: authUser.member.id },
    select: { id: true, name: true, relationship: true },
    orderBy: { name: "asc" },
  });

  return (
    <EditReservationClient
      reservation={{
        id: reservation.id,
        type: reservation.type,
        scheduledAt: reservation.scheduledAt.toISOString(),
        durationMin: reservation.durationMin,
        deceasedPersonId: reservation.deceasedPersonId ?? "",
        notes: reservation.notes ?? "",
        attendees: reservation.attendees ?? null,
        purificationRequired: reservation.purificationRequired,
        flowerOrder: reservation.flowerOrder,
        flowerDetail: reservation.flowerDetail ?? "",
        cateringOrder: reservation.cateringOrder,
        cateringCount: reservation.cateringCount ?? null,
        cateringDetail: reservation.cateringDetail ?? "",
      }}
      deceasedPersons={deceasedPersons}
    />
  );
}
