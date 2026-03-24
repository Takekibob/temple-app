import Link from "next/link";
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
  CONFIRMED: "確定",
  COMPLETED: "完了",
  CANCELLED: "キャンセル",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-stone-100 text-stone-600",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function ReservationsPage() {
  const authUser = await getAuthUser();
  if (!authUser?.member) return null;

  const reservations = await prisma.reservation.findMany({
    where: { memberId: authUser.member.id },
    include: { deceasedPerson: { select: { name: true } } },
    orderBy: { scheduledAt: "desc" },
  });

  const upcoming = reservations.filter(
    (r) => r.status !== "CANCELLED" && r.status !== "COMPLETED" && r.scheduledAt > new Date()
  );
  const past = reservations.filter(
    (r) => r.status === "COMPLETED" || r.status === "CANCELLED" || r.scheduledAt <= new Date()
  );

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-stone-800">法要予約</h1>
        <Link
          href="/app/reservations/new"
          className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
        >
          新規予約
        </Link>
      </div>

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-stone-500 mb-2">予定</h2>
          <ul className="space-y-3">
            {upcoming.map((r) => (
              <li key={r.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-stone-800">{TYPE_LABELS[r.type] ?? r.type}</p>
                    {r.deceasedPerson && (
                      <p className="text-xs text-stone-500 mt-0.5">{r.deceasedPerson.name}</p>
                    )}
                    <p className="text-sm text-stone-600 mt-1">
                      {r.scheduledAt.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}{" "}
                      {r.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">{r.durationMin}分</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
                {r.status === "PENDING" && (
                  <CancelButton id={r.id} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcoming.length === 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center mb-6">
          <p className="text-stone-400 text-sm">予定している法要はありません</p>
          <Link
            href="/app/reservations/new"
            className="mt-3 inline-block text-amber-700 text-sm hover:underline"
          >
            法要を予約する →
          </Link>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-stone-500 mb-2">過去の予約</h2>
          <ul className="space-y-2">
            {past.map((r) => (
              <li key={r.id} className="bg-white rounded-xl border border-stone-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{TYPE_LABELS[r.type] ?? r.type}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {r.scheduledAt.toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CancelButton({ id }: { id: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { prisma: db } = await import("@/lib/prisma");
        await db.reservation.update({ where: { id }, data: { status: "CANCELLED" } });
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/app/reservations");
      }}
      className="mt-3"
    >
      <button
        type="submit"
        className="text-xs text-red-600 hover:underline"
      >
        キャンセルする
      </button>
    </form>
  );
}
