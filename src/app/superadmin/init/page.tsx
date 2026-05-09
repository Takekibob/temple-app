import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SuperAdminInitClient from "./SuperAdminInitClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminInitPage() {
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });

  if (existing) {
    redirect("/superadmin");
  }

  const configured = !!process.env.SUPER_ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <SuperAdminInitClient configured={configured} />
    </div>
  );
}
