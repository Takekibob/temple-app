import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FeedbackClient from "./FeedbackClient";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");
  if (!authUser.member) redirect("/app");

  const { id: eventId } = await params;

  const [event, participation] = await Promise.all([
    prisma.event.findFirst({
      where: { id: eventId, templeId: authUser.templeId },
      select: { id: true, title: true, eventDate: true, startTime: true },
    }),
    prisma.eventParticipation.findUnique({
      where: { eventId_memberId: { eventId, memberId: authUser.member.id } },
      select: { feedbackScore: true, feedbackComment: true, status: true },
    }),
  ]);

  if (!event) notFound();
  if (!participation || !["ATTENDED", "CONFIRMED", "APPLIED"].includes(participation.status)) {
    redirect(`/app/events/${eventId}`);
  }

  return (
    <FeedbackClient
      eventId={event.id}
      eventTitle={event.title}
      eventDate={event.eventDate.toISOString()}
      existing={
        participation.feedbackScore != null
          ? { score: participation.feedbackScore, comment: participation.feedbackComment ?? "" }
          : null
      }
    />
  );
}
