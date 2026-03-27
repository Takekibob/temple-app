import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StaffClient from "./StaffClient";

export default async function AdminStaffPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  // STAFF ロールはリダイレクト
  if (!["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) redirect("/admin");

  const staff = await prisma.user.findMany({
    where: {
      templeId: authUser.templeId,
      role: { in: ["ADMIN", "STAFF"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  const initialStaff = staff.map((s) => ({
    ...s,
    role: s.role as string,
    lastLoginAt: s.lastLoginAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  return <StaffClient initialStaff={initialStaff} currentUserId={authUser.id} />;
}
