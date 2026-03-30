import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicDonationClient from "./PublicDonationClient";

export default async function PublicDonationPage({
  params,
}: {
  params: Promise<{ templeId: string }>;
}) {
  const { templeId } = await params;

  const temple = await prisma.temple.findUnique({
    where: { id: templeId, isActive: true },
    select: { id: true, name: true, description: true, logoUrl: true },
  });

  if (!temple) notFound();

  return <PublicDonationClient temple={temple} />;
}
