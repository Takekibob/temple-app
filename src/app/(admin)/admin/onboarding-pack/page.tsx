import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingPackClient from "./OnboardingPackClient";

export default async function OnboardingPackPage() {
  const authUser = await requireAdmin();

  const pack = await prisma.onboardingPack.findFirst({
    where: { templeId: authUser.templeId },
    orderBy: { createdAt: "desc" },
  });

  return <OnboardingPackClient existingPack={pack} />;
}
