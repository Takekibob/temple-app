import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const events = await prisma.event.findMany({
    where: {
      templeId: authUser.templeId,
      status: "PUBLISHED",
      eventDate: { gte: monthStart, lt: monthEnd },
      visibility: { in: ["PUBLIC", "FOLLOWERS_ONLY"] },
    },
    select: {
      id: true, title: true, eventDate: true, startTime: true, endTime: true,
      category: true, fee: true,
    },
    orderBy: { eventDate: "asc" },
  });

  const initialData = {
    year,
    month,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.eventDate.toISOString().slice(0, 10),
      startTime: e.startTime,
      endTime: e.endTime,
      category: e.category as string,
      fee: e.fee,
      type: "event" as const,
      color: "green" as const,
    })),
  };

  return <CalendarClient initialData={initialData} />;
}
