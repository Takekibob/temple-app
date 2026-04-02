import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DonationFormClient from "./DonationFormClient";

export default async function NewDonationPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
    select: { id: true, name: true, stripeConnectOnboarded: true },
  });

  if (!temple) redirect("/app");
  if (!temple.stripeConnectOnboarded) redirect("/app/donations");

  return <DonationFormClient temple={temple} userEmail={authUser.email} />;
}
