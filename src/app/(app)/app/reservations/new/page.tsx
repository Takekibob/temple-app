import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewReservationClient from "./NewReservationClient";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ deceasedPersonId?: string; type?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser?.member) return null;

  const isAdminOrStaff = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
  if (isAdminOrStaff) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-stone-600 mb-4">管理者・スタッフは法要の予約ができません。</p>
          <a href="/app/reservations" className="text-amber-700 text-sm hover:text-amber-900">
            予約一覧に戻る
          </a>
        </div>
      </div>
    );
  }

  const { deceasedPersonId, type } = await searchParams;

  const deceasedPersons = await prisma.deceasedPerson.findMany({
    where: { memberId: authUser.member.id },
    select: { id: true, name: true, relationship: true },
    orderBy: { name: "asc" },
  });

  return (
    <NewReservationClient
      deceasedPersons={deceasedPersons}
      initialDeceasedPersonId={deceasedPersonId}
      initialType={type}
    />
  );
}
