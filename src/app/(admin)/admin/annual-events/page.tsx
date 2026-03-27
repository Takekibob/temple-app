import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AnnualEventsClient from "./AnnualEventsClient";

export default async function AdminAnnualEventsPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const events = await prisma.annualEvent.findMany({
    where: { templeId: authUser.templeId },
    orderBy: [{ month: "asc" }, { day: "asc" }],
  });

  const initialEvents = events.map((e) => ({
    id: e.id,
    name: e.name,
    month: e.month,
    day: e.day,
    endDay: e.endDay,
    description: e.description,
    isRecurring: e.isRecurring,
    showOnCalendar: e.showOnCalendar,
  }));

  return <AnnualEventsClient initialEvents={initialEvents} />;
}
