import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function AdminSettingsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");
  if (authUser.role === "STAFF") redirect("/admin");

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
    websiteUrl: temple.websiteUrl,
    instagramUrl: temple.instagramUrl,
    lineOfficialUrl: temple.lineOfficialUrl,
    youtubeUrl: temple.youtubeUrl,
    logoUrl: temple.logoUrl,
    description: temple.description,
    customEventCategories: (temple.customEventCategories as string[]) ?? [],
    stripeConnectAccountId: temple.stripeConnectAccountId,
    stripeConnectOnboarded: temple.stripeConnectOnboarded,
  };

  return <SettingsClient initialSettings={initialSettings} isAdmin={isAdmin} />;
}
