import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "初盆・お盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "その他",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "確認待ち",
  CONFIRMED: "確定済み",
  COMPLETED: "完了",
  CANCELLED: "キャンセル",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-stone-100 text-stone-600",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser?.member) redirect("/");

  const { id } = await params;

  const reservation = await prisma.reservation.findFirst({
    where: { id, memberId: authUser.member.id },
    include: { deceasedPerson: { select: { name: true } } },
  });

  if (!reservation) notFound();

  const canEdit = reservation.status === "PENDING" || reservation.status === "CONFIRMED";

  const rows: { label: string; value: string | null }[] = [
    { label: "種類", value: TYPE_LABELS[reservation.type] ?? reservation.type },
    {
      label: "日時",
      value: `${reservation.scheduledAt.toLocaleDateString("ja-JP", {
        year: "numeric", month: "long", day: "numeric", weekday: "short",
      })} ${reservation.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`,
    },
    { label: "所要時間", value: `${reservation.durationMin}分` },
    { label: "故人", value: reservation.deceasedPerson?.name ?? null },
    { label: "参列人数", value: reservation.attendees != null ? `${reservation.attendees}名` : null },
    { label: "お祓い", value: reservation.purificationRequired ? "あり" : "なし" },
    { label: "花の注文", value: reservation.flowerOrder ? (reservation.flowerDetail || "あり") : "なし" },
    {
      label: "お斎",
      value: reservation.cateringOrder
        ? `あり${reservation.cateringCount != null ? `（${reservation.cateringCount}名）` : ""}${reservation.cateringDetail ? `・${reservation.cateringDetail}` : ""}`
        : "なし",
    },
    { label: "備考", value: reservation.notes || null },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app/reservations" className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"><ChevronLeft size={18} /></Link>
          <h1 className="text-base font-bold text-stone-800">予約詳細</h1>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[reservation.status]}`}>
          {STATUS_LABELS[reservation.status]}
        </span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          {rows.filter(r => r.value !== null).map(({ label, value }, i) => (
            <div key={label} className={`px-4 py-3.5 flex items-start gap-4 ${i > 0 ? "border-t border-stone-50" : ""}`}>
              <p className="text-xs text-stone-400 w-24 shrink-0 pt-0.5">{label}</p>
              <p className="text-sm text-stone-700">{value}</p>
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="space-y-2">
            <Link
              href={`/app/reservations/${reservation.id}/edit`}
              className="flex items-center justify-center w-full py-3 border border-amber-300 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-50 transition-colors"
            >
              内容を変更する
            </Link>
            <CancelForm id={reservation.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function CancelForm({ id }: { id: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { prisma: db } = await import("@/lib/prisma");
        await db.reservation.update({ where: { id }, data: { status: "CANCELLED" } });
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/app/reservations");
      }}
    >
      <button
        type="submit"
        className="w-full py-3 border border-red-200 text-red-600 text-sm rounded-xl hover:bg-red-50 transition-colors"
      >
        キャンセルする
      </button>
    </form>
  );
}
