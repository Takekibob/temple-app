import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function TempleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const temple = await prisma.temple.findUnique({
    where: { id },
    include: {
      users: { where: { role: { in: ["ADMIN", "STAFF"] } }, select: { id: true, name: true, email: true, role: true, lastLoginAt: true } },
      _count: { select: { members: true, events: true } },
    },
  });
  if (!temple) notFound();

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/superadmin/temples" className="text-stone-400 hover:text-white text-sm">← お寺一覧</Link>
        <span className="text-stone-700">/</span>
        <h1 className="text-xl font-bold text-white">{temple.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: "メンバー数", value: temple._count.members },
          { label: "イベント数", value: temple._count.events },
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
          ].map((r) => (
            <div key={r.label} className="flex gap-4">
              <dt className="text-stone-500 w-28 shrink-0">{r.label}</dt>
              <dd className="text-stone-200">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
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
    </div>
  );
}
