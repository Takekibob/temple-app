import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PrintButton from "./PrintButton";

const TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "初盆・お盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "その他",
};

export default async function ReservationPrintPage({
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

  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
    select: { name: true, phone: true, address: true },
  });

  const typeLabel = TYPE_LABELS[reservation.type] ?? reservation.type;
  const dateStr = reservation.scheduledAt.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });
  const timeStr = reservation.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-white">
      {/* Print controls — hidden when printing */}
      <div className="print:hidden p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
        <p className="text-sm text-stone-600">印刷プレビュー</p>
        <PrintButton />
      </div>

      {/* Printable content */}
      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center border-b border-stone-300 pb-6 mb-6">
          <p className="text-sm text-stone-500">{temple?.name}</p>
          <h1 className="text-2xl font-bold text-stone-900 mt-1">法要予約確認書</h1>
          <p className="text-xs text-stone-400 mt-2">
            発行日: {new Date().toLocaleDateString("ja-JP")}
          </p>
        </div>

        {/* Reservation details */}
        <table className="w-full text-sm mb-8">
          <tbody>
            <tr className="border-b border-stone-100">
              <th className="text-left py-2.5 pr-4 w-32 text-stone-500 font-medium">種別</th>
              <td className="py-2.5 text-stone-900 font-semibold text-base">{typeLabel}</td>
            </tr>
            <tr className="border-b border-stone-100">
              <th className="text-left py-2.5 pr-4 text-stone-500 font-medium">日時</th>
              <td className="py-2.5 text-stone-900">{dateStr} {timeStr}</td>
            </tr>
            <tr className="border-b border-stone-100">
              <th className="text-left py-2.5 pr-4 text-stone-500 font-medium">所要時間</th>
              <td className="py-2.5 text-stone-900">{reservation.durationMin}分</td>
            </tr>
            {reservation.deceasedPerson && (
              <tr className="border-b border-stone-100">
                <th className="text-left py-2.5 pr-4 text-stone-500 font-medium">対象故人</th>
                <td className="py-2.5 text-stone-900">
                  {reservation.deceasedPerson.name}
                  {reservation.deceasedPerson.relationship ? `（${reservation.deceasedPerson.relationship}）` : ""}
                </td>
              </tr>
            )}
            {reservation.attendees != null && (
              <tr className="border-b border-stone-100">
                <th className="text-left py-2.5 pr-4 text-stone-500 font-medium">参列人数</th>
                <td className="py-2.5 text-stone-900">{reservation.attendees}名</td>
              </tr>
            )}
            <tr className="border-b border-stone-100">
              <th className="text-left py-2.5 pr-4 text-stone-500 font-medium">お清め</th>
              <td className="py-2.5 text-stone-900">{reservation.purificationRequired ? "あり" : "なし"}</td>
            </tr>
            <tr className="border-b border-stone-100">
              <th className="text-left py-2.5 pr-4 text-stone-500 font-medium">お花</th>
              <td className="py-2.5 text-stone-900">
                {reservation.flowerOrder
                  ? `注文あり${reservation.flowerDetail ? `（${reservation.flowerDetail}）` : ""}`
                  : "なし"}
              </td>
            </tr>
            <tr className="border-b border-stone-100">
              <th className="text-left py-2.5 pr-4 text-stone-500 font-medium">お料理</th>
              <td className="py-2.5 text-stone-900">
                {reservation.cateringOrder
                  ? `注文あり${reservation.cateringCount ? `・${reservation.cateringCount}名分` : ""}${reservation.cateringDetail ? `（${reservation.cateringDetail}）` : ""}`
                  : "なし"}
              </td>
            </tr>
            {reservation.notes && (
              <tr className="border-b border-stone-100">
                <th className="text-left py-2.5 pr-4 text-stone-500 font-medium">備考</th>
                <td className="py-2.5 text-stone-900">{reservation.notes}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Member info */}
        <div className="border border-stone-200 rounded-lg p-4 mb-8">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">予約者情報</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-stone-400">氏名</dt>
            <dd className="text-stone-800">{reservation.member.user.name}</dd>
            <dt className="text-stone-400">電話番号</dt>
            <dd className="text-stone-800">{reservation.member.user.phone ?? "—"}</dd>
            <dt className="text-stone-400">メールアドレス</dt>
            <dd className="text-stone-800">{reservation.member.user.email}</dd>
          </dl>
        </div>

        {/* Temple info */}
        {temple && (
          <div className="text-center text-xs text-stone-400 mt-8 pt-6 border-t border-stone-200">
            <p className="font-medium text-stone-600">{temple.name}</p>
            {temple.address && <p>{temple.address}</p>}
            {temple.phone && <p>TEL: {temple.phone}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
