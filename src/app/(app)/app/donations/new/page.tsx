import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DonationFormClient from "./DonationFormClient";

export default async function NewDonationPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
    select: { id: true, name: true },
  });

  if (!temple) redirect("/app");

  return <DonationFormClient temple={temple} />;
}
