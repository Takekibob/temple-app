import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReservationStatusForm from "./ReservationStatusForm";
import { ChevronLeft, Printer, CalendarDays, Clock, User, Flower2, UtensilsCrossed, Users } from "lucide-react";

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
      member: { include: { user: { select: { name: true, email: true, phone: true } } } },
      deceasedPerson: { select: { name: true, relationship: true } },
    },
  });

  if (!reservation) notFound();

  const isStaffOnly = authUser.role === "STAFF";

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      {/* パンくず */}
      <Link href="/admin/reservations" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 mb-4 transition-colors">
        <ChevronLeft size={14} />法要予約一覧
      </Link>

      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-bold text-stone-800">
              {TYPE_LABELS[reservation.type] ?? reservation.type}
            </h1>
            {reservation.isAdminCreated && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                代理入力
              </span>
            )}
            {reservation.memberEditedAt && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                内容変更あり
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500">{reservation.member.user.name}</p>
        </div>
        <Link href={`/admin/reservations/${id}/print`} target="_blank"
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors">
          <Printer size={14} />印刷
        </Link>
      </div>

      <div className="space-y-3">
        {/* ステータス */}
        <ReservationStatusForm
          id={reservation.id}
          currentStatus={reservation.status}
          isReadOnly={isStaffOnly}
        />

        {/* 日時 */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={15} className="text-amber-700" />
            <h2 className="font-semibold text-amber-800 text-sm">法要日時</h2>
          </div>
          <p className="text-2xl font-bold text-amber-900">
            {reservation.scheduledAt.toLocaleDateString("ja-JP", {
              year: "numeric", month: "long", day: "numeric", weekday: "short",
            })}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-amber-700">
              <Clock size={14} />
              <span className="text-lg font-semibold">
                {reservation.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}〜
              </span>
            </div>
            <span className="text-sm text-amber-600">{reservation.durationMin}分</span>
          </div>
        </div>

        {/* 予約詳細 */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <h2 className="font-semibold text-stone-800 text-sm mb-3">詳細情報</h2>
          <div className="space-y-3">
            {reservation.deceasedPerson && (
              <InfoRow label="対象故人">
                {reservation.deceasedPerson.name}
                {reservation.deceasedPerson.relationship && `（${reservation.deceasedPerson.relationship}）`}
              </InfoRow>
            )}
            {reservation.attendees != null && (
              <InfoRow icon={<Users size={13} className="text-stone-400" />} label="参列人数">
                {reservation.attendees}名
              </InfoRow>
            )}
            <InfoRow label="お清め">
              {reservation.purificationRequired ? (
                <span className="text-teal-700 font-medium">あり</span>
              ) : "なし"}
            </InfoRow>
            <InfoRow icon={<Flower2 size={13} className="text-stone-400" />} label="お花">
              {reservation.flowerOrder
                ? <span className="text-teal-700 font-medium">注文あり{reservation.flowerDetail && `（${reservation.flowerDetail}）`}</span>
                : "なし"}
            </InfoRow>
            <InfoRow icon={<UtensilsCrossed size={13} className="text-stone-400" />} label="お料理">
              {reservation.cateringOrder
                ? <span className="text-teal-700 font-medium">
                    注文あり{reservation.cateringCount && `・${reservation.cateringCount}名分`}
                    {reservation.cateringDetail && `（${reservation.cateringDetail}）`}
                  </span>
                : "なし"}
            </InfoRow>
            {reservation.notes && (
              <div className="pt-2 border-t border-stone-50">
                <p className="text-xs text-stone-400 mb-1">備考</p>
                <p className="text-sm text-stone-700 bg-stone-50 rounded-xl p-3 leading-relaxed">{reservation.notes}</p>
              </div>
            )}
            {reservation.memberEditedAt && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                {reservation.memberEditedAt.toLocaleDateString("ja-JP")} {reservation.memberEditedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} に変更
              </p>
            )}
          </div>
        </div>

        {/* 予約者 */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-stone-400" />
              <h2 className="font-semibold text-stone-800 text-sm">予約者</h2>
            </div>
            <Link href={`/admin/members/${reservation.memberId}`}
              className="text-xs text-amber-700 hover:text-amber-900 font-medium">
              会員詳細 →
            </Link>
          </div>
          <div className="space-y-2">
            <InfoRow label="氏名">{reservation.member.user.name}</InfoRow>
            {reservation.member.user.phone && (
              <InfoRow label="電話">
                <a href={`tel:${reservation.member.user.phone}`} className="text-amber-700 hover:underline">
                  {reservation.member.user.phone}
                </a>
              </InfoRow>
            )}
            <InfoRow label="メール">{reservation.member.user.email}</InfoRow>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="flex items-start gap-3 flex-1">
        <span className="text-xs text-stone-400 w-16 shrink-0 mt-0.5">{label}</span>
        <span className="text-sm text-stone-800 flex-1">{children}</span>
      </div>
    </div>
  );
}
