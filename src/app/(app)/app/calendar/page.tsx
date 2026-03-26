import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const isDanka = authUser.member?.type === "DANKA";

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const visibilityFilter = isDanka
    ? { in: ["PUBLIC", "MEMBERS_ONLY", "DANKA_ONLY"] as ("PUBLIC" | "MEMBERS_ONLY" | "DANKA_ONLY")[] }
    : { in: ["PUBLIC", "MEMBERS_ONLY"] as ("PUBLIC" | "MEMBERS_ONLY")[] };

  const [events, reservations, annualEvents] = await Promise.all([
    prisma.event.findMany({
      where: {
        templeId: authUser.templeId,
        status: "PUBLISHED",
        eventDate: { gte: monthStart, lt: monthEnd },
        visibility: visibilityFilter,
      },
      select: {
        id: true, title: true, eventDate: true, startTime: true, endTime: true,
        visibility: true, category: true, fee: true,
      },
      orderBy: { eventDate: "asc" },
    }),
    isDanka && authUser.member
      ? prisma.reservation.findMany({
          where: {
            memberId: authUser.member.id,
            scheduledAt: { gte: monthStart, lt: monthEnd },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          select: { id: true, type: true, scheduledAt: true, status: true },
          orderBy: { scheduledAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.annualEvent.findMany({
      where: { templeId: authUser.templeId, month },
      select: { id: true, name: true, month: true, day: true, description: true },
      orderBy: { day: "asc" },
    }),
  ]);

  const RESERVATION_TYPE_LABELS: Record<string, string> = {
    ANNUAL_MEMORIAL: "年忌法要", MONTHLY_MEMORIAL: "月命日",
    NIBON: "初盆・お盆", KUYO: "供養", FUNERAL: "葬儀", OTHER: "その他",
  };

  const initialData = {
    year,
    month,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.eventDate.toISOString().slice(0, 10),
      startTime: e.startTime,
      endTime: e.endTime,
      visibility: e.visibility as string,
      category: e.category as string,
      fee: e.fee,
      type: "event" as const,
      color: (e.visibility === "DANKA_ONLY" ? "blue" : "green") as "blue" | "green",
    })),
    reservations: (reservations as Awaited<ReturnType<typeof prisma.reservation.findMany>>).map((r) => ({
      id: r.id,
      title: RESERVATION_TYPE_LABELS[r.type] ?? r.type,
      date: r.scheduledAt.toISOString().slice(0, 10),
      startTime: r.scheduledAt.toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit",
      }),
      status: r.status as string,
      type: "reservation" as const,
      color: "purple" as const,
    })),
    annualEvents: annualEvents.map((a) => ({
      id: a.id,
      title: a.name,
      date: `${year}-${String(month).padStart(2, "0")}-${String(a.day).padStart(2, "0")}`,
      description: a.description,
      type: "annual" as const,
      color: "orange" as const,
    })),
  };

  return <CalendarClient initialData={initialData} isDanka={isDanka} />;
}
