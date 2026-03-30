import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TempleDetailClient from "./TempleDetailClient";

const PLAN_LABELS: Record<string, string> = {
  TRIAL: "トライアル", ACTIVE: "有効", PAST_DUE: "支払遅延",
  CANCELLED: "解約済", SUSPENDED: "停止中",
};
const PLAN_COLORS: Record<string, string> = {
  TRIAL: "bg-blue-900/50 text-blue-300", ACTIVE: "bg-teal-900/50 text-teal-300",
  PAST_DUE: "bg-amber-900/50 text-amber-300", CANCELLED: "bg-stone-800 text-stone-400",
  SUSPENDED: "bg-red-900/50 text-red-300",
};

export default async function TempleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const temple = await prisma.temple.findUnique({
    where: { id },
    include: {
      users: { where: { role: { in: ["ADMIN", "STAFF"] } }, select: { id: true, name: true, email: true, role: true, lastLoginAt: true } },
      _count: { select: { members: true, events: true, ofuse: true, reservations: true } },
    },
  });
  if (!temple) notFound();

  const totalOfuse = await prisma.ofuse.aggregate({ where: { templeId: id }, _sum: { amount: true } });

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/superadmin/temples" className="text-stone-400 hover:text-white text-sm">← お寺一覧</Link>
        <span className="text-stone-700">/</span>
        <h1 className="text-xl font-bold text-white">{temple.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[temple.planStatus]}`}>
          {PLAN_LABELS[temple.planStatus]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: "会員数", value: temple._count.members },
          { label: "イベント数", value: temple._count.events },
          { label: "予約数", value: temple._count.reservations },
          { label: "お布施合計", value: `¥${(totalOfuse._sum.amount ?? 0).toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-stone-900 rounded-xl border border-stone-800 p-4">
            <p className="text-xs text-stone-400">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 mb-4">
        <h2 className="text-sm font-semibold text-stone-300 mb-3">基本情報</h2>
        <dl className="space-y-2 text-sm">
          {[
            { label: "宗派", value: temple.denomination ?? "—" },
            { label: "住所", value: temple.address ?? "—" },
            { label: "電話", value: temple.phone ?? "—" },
            { label: "登録日", value: temple.createdAt.toLocaleDateString("ja-JP") },
            { label: "トライアル終了", value: temple.trialEndsAt?.toLocaleDateString("ja-JP") ?? "—" },
          ].map((r) => (
            <div key={r.label} className="flex gap-4">
              <dt className="text-stone-500 w-28 shrink-0">{r.label}</dt>
              <dd className="text-stone-200">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 mb-4">
        <h2 className="text-sm font-semibold text-stone-300 mb-3">スタッフ一覧</h2>
        {temple.users.length === 0 ? (
          <p className="text-stone-500 text-sm">スタッフなし</p>
        ) : (
          <div className="space-y-2">
            {temple.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <div>
                  <p className="text-stone-200 text-sm">{u.name}</p>
                  <p className="text-stone-500 text-xs">{u.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-400">{u.role}</span>
                  <p className="text-xs text-stone-600">{u.lastLoginAt?.toLocaleDateString("ja-JP") ?? "未ログイン"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TempleDetailClient templeId={id} currentPlan={temple.planStatus} />
    </div>
  );
}
