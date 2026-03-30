import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EventFormClient from "../EventFormClient";

export default async function AdminEventNewPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
    select: { customEventCategories: true },
  });
  const customCategories = (temple?.customEventCategories as string[]) ?? [];

  return <EventFormClient customCategories={customCategories} />;
}
