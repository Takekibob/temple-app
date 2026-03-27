import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function AdminSettingsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
  });

  if (!temple) redirect("/admin");

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(authUser.role);

  const initialSettings = {
    id: temple.id,
    name: temple.name,
    denomination: temple.denomination,
    address: temple.address,
    phone: temple.phone,
    email: temple.email,
    logoUrl: temple.logoUrl,
    description: temple.description,
    bookingStartTime: temple.bookingStartTime,
    bookingEndTime: temple.bookingEndTime,
    bookingDuration: temple.bookingDuration,
    bookingMaxSlots: temple.bookingMaxSlots,
    bookingAdvanceDays: temple.bookingAdvanceDays,
    reminderDayBefore: temple.reminderDayBefore,
    reminderDayBeforeTime: temple.reminderDayBeforeTime,
    reminderDayOf: temple.reminderDayOf,
    reminderDayOfTime: temple.reminderDayOfTime,
    reminderMeinichi: temple.reminderMeinichi,
    customEventCategories: (temple.customEventCategories as string[]) ?? [],
  };

  return <SettingsClient initialSettings={initialSettings} isAdmin={isAdmin} />;
}
