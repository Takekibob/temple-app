import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChevronLeft, Stamp, ScrollText, MapPin } from "lucide-react";

export default async function TempleHistoryPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const memberId = authUser.member.id;

  const templeVisits = await prisma.templeVisit.findMany({
    where: { memberId },
    select: {
      id: true,
      memo: true,
      visitedAt: true,
      temple: { select: { id: true, name: true, denomination: true, address: true } },
    },
    orderBy: { visitedAt: "desc" },
  });

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link href="/app" className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">参拝履歴</h1>
          <p className="text-xs text-stone-400 mt-0.5">いつ・どこで・何を書いたかの記録</p>
        </div>
        <Link
          href="/app/temples/visit"
          className="flex items-center gap-1.5 text-xs font-semibold bg-teal-600 text-white px-3 py-2 rounded-xl hover:bg-teal-700 transition-colors shadow-sm shrink-0"
        >
          <Stamp size={13} />
          記録する
        </Link>
      </div>

      <div className="px-4 space-y-3">
        {templeVisits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Stamp size={26} className="text-teal-500" />
            </div>
            <p className="text-stone-500 text-sm font-medium mb-1">まだ参拝の記録がありません</p>
            <p className="text-xs text-stone-400 mb-4">お参りした後にメモを残してみましょう</p>
            <Link href="/app/temples/visit" className="text-teal-600 text-sm font-semibold hover:underline">
              参拝を記録する →
            </Link>
          </div>
        ) : (
          templeVisits.map((v) => (
            <div key={v.id} className="bg-white border border-stone-100 rounded-2xl shadow-sm p-4">
              {/* 日付・お寺 */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/app/temples/${v.temple.id}`}
                    className="text-sm font-bold text-stone-800 hover:text-teal-600 transition-colors"
                  >
                    {v.temple.name}
                  </Link>
                  {v.temple.denomination && (
                    <span className="ml-2 text-xs text-amber-700 font-medium">{v.temple.denomination}</span>
                  )}
                  {v.temple.address && (
                    <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={10} />
                      {v.temple.address}
                    </p>
                  )}
                </div>
                <span className="text-xs text-stone-400 shrink-0">
                  {v.visitedAt.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", weekday: "short" })}
                </span>
              </div>

              {/* メモ */}
              {v.memo ? (
                <div className="flex gap-2 mt-2 pt-2 border-t border-stone-50">
                  <ScrollText size={12} className="text-stone-300 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">{v.memo}</p>
                </div>
              ) : (
                <div className="mt-2 pt-2 border-t border-stone-50">
                  <p className="text-xs text-stone-300 italic">メモなし</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
