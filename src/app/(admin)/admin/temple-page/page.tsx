import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TemplePageEditor from "./TemplePageEditor";

export default async function TemplePageAdminPage() {
  const authUser = await requireAdmin();

  const [temple, page] = await Promise.all([
    prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: { name: true, description: true, coverImageUrl: true },
    }),
    prisma.templePage.findUnique({
      where: { templeId: authUser.templeId },
    }),
  ]);

  return <TemplePageEditor temple={temple} existingPage={page} />;
}
