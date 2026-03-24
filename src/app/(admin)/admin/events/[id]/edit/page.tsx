import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EventFormClient from "../../EventFormClient";

export default async function AdminEventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, templeId: authUser.templeId },
  });

  if (!event) notFound();

  return (
    <EventFormClient
      isEdit
      initialData={{
        id: event.id,
        title: event.title,
        description: event.description ?? "",
        category: event.category,
        eventDate: event.eventDate.toISOString(),
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location ?? "",
        capacity: event.capacity,
        fee: event.fee,
        visibility: event.visibility,
        imageUrl: event.imageUrl ?? "",
        status: event.status,
      }}
    />
  );
}
