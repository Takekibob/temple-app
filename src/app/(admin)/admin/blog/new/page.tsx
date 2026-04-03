import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BlogFormClient from "../BlogFormClient";

export default async function AdminBlogNewPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const activePlan = await prisma.membershipPlan.findFirst({
    where: { templeId: authUser.templeId, isActive: true },
    select: { id: true },
  });

  return <BlogFormClient hasActivePlan={!!activePlan} />;
}
