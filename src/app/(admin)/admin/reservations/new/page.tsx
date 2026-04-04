import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminNewReservationClient from "./AdminNewReservationClient";

export default async function AdminNewReservationPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  // Fetch DANKA members for this temple
  const dankaMembers = await prisma.member.findMany({
    where: { templeId: authUser.templeId, type: "DANKA" },
    include: {
      user: { select: { name: true } },
      deceasedPersons: { select: { id: true, name: true }, orderBy: { deathDate: "desc" } },
    },
    orderBy: { familyName: "asc" },
  });

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Link href="/admin/reservations" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← 法要予約管理
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-6">代理予約入力</h1>
      <AdminNewReservationClient
        members={dankaMembers.map((m) => ({
          id: m.id,
          name: m.user.name,
          familyName: m.familyName,
          deceasedPersons: m.deceasedPersons,
        }))}
      />
    </div>
  );
}
