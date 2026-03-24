import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReservationStatusForm from "./ReservationStatusForm";

const TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "初盆・お盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "その他",
};

export default async function AdminReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;

  const reservation = await prisma.reservation.findFirst({
    where: { id, templeId: authUser.templeId },
    include: {
      member: {
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
      },
      deceasedPerson: true,
    },
  });

  if (!reservation) notFound();

  const isStaffOnly = authUser.role === "STAFF";

  return (
    <div className="p-6 max-w-2xl">
      <Link
        href="/admin/reservations"
        className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block"
      >
        ← 法要予約一覧
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-6">予約詳細</h1>

      <div className="space-y-4">
        {/* 予約情報 */}
        <section className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="font-semibold text-stone-800 mb-3">予約情報</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-stone-400">種別</dt>
            <dd className="text-stone-800 font-medium">{TYPE_LABELS[reservation.type] ?? reservation.type}</dd>

            <dt className="text-stone-400">日時</dt>
            <dd className="text-stone-800">
              {reservation.scheduledAt.toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}{" "}
              {reservation.scheduledAt.toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </dd>

            <dt className="text-stone-400">所要時間</dt>
            <dd className="text-stone-800">{reservation.durationMin}分</dd>

            {reservation.deceasedPerson && (
              <>
                <dt className="text-stone-400">対象故人</dt>
                <dd className="text-stone-800">
                  {reservation.deceasedPerson.name}
                  {reservation.deceasedPerson.relationship
                    ? `（${reservation.deceasedPerson.relationship}）`
                    : ""}
                </dd>
              </>
            )}

            {reservation.notes && (
              <>
                <dt className="text-stone-400">備考</dt>
                <dd className="text-stone-800">{reservation.notes}</dd>
              </>
            )}

            <dt className="text-stone-400">予約日</dt>
            <dd className="text-stone-400">{reservation.createdAt.toLocaleDateString("ja-JP")}</dd>
          </dl>
        </section>

        {/* 会員情報 */}
        <section className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-800">予約者</h2>
            <Link
              href={`/admin/members/${reservation.memberId}`}
              className="text-xs text-amber-700 hover:underline"
            >
              会員詳細 →
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-stone-400">氏名</dt>
            <dd className="text-stone-800">{reservation.member.user.name}</dd>
            <dt className="text-stone-400">メール</dt>
            <dd className="text-stone-800">{reservation.member.user.email}</dd>
            {reservation.member.user.phone && (
              <>
                <dt className="text-stone-400">電話</dt>
                <dd className="text-stone-800">{reservation.member.user.phone}</dd>
              </>
            )}
          </dl>
        </section>

        {/* ステータス管理 */}
        <ReservationStatusForm
          id={reservation.id}
          currentStatus={reservation.status}
          isReadOnly={isStaffOnly}
        />
      </div>
    </div>
  );
}
