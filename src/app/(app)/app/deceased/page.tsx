import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextNenki } from "@/lib/nenki";
import { ScrollText, Calendar, CalendarDays, ChevronRight } from "lucide-react";

export default async function UserDeceasedPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  if (!authUser.member || authUser.member.type !== "DANKA") {
    redirect("/app");
  }

  const deceasedList = await prisma.deceasedPerson.findMany({
    where: { memberId: authUser.member.id },
    orderBy: { deathDate: "desc" },
  });

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">過去帳</h1>
        <p className="text-xs text-stone-400 mt-0.5">ご先祖様の法要情報</p>
      </div>

      <div className="px-4 space-y-3">
        {deceasedList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ScrollText size={22} className="text-stone-400" />
            </div>
            <p className="text-stone-600 text-sm font-medium mb-1">過去帳への登録はお寺にご依頼ください</p>
            <p className="text-stone-400 text-xs">
              ご先祖様の戒名・没年月日・年忌法要の管理をお手伝いします
            </p>
          </div>
        ) : (
          deceasedList.map((d) => {
            const nextNenki = d.deathDate ? getNextNenki(d.deathDate) : null;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                {/* 故人ヘッダー */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-stone-800">{d.name}</h2>
                      {d.relationship && (
                        <p className="text-xs text-stone-400 mt-0.5">{d.relationship}</p>
                      )}
                    </div>
                    {d.age && (
                      <span className="text-xs text-stone-400 bg-stone-50 border border-stone-100 px-2.5 py-1 rounded-full">
                        享年 {d.age} 歳
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-3">
                    {d.kaimyo && (
                      <div className="flex gap-3 text-sm">
                        <span className="text-stone-400 w-12 shrink-0">戒名</span>
                        <span className="text-stone-700">{d.kaimyo}</span>
                      </div>
                    )}
                    {d.deathDate && (
                      <div className="flex gap-3 text-sm items-center">
                        <span className="text-stone-400 w-12 shrink-0">没年</span>
                        <span className="text-stone-600 flex items-center gap-1">
                          <Calendar size={12} className="text-stone-400" />
                          {d.deathDate.toLocaleDateString("ja-JP", {
                            year: "numeric", month: "long", day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 次回年忌 */}
                {nextNenki ? (
                  <div className="mx-4 mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">次回の年忌</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-amber-800">{nextNenki.name}</p>
                      <p className="text-xs text-stone-500 flex items-center gap-1">
                        <CalendarDays size={11} />
                        {nextNenki.date.toLocaleDateString("ja-JP", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mx-4 mb-4 bg-stone-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-stone-400">年忌はすべて終えられました</p>
                  </div>
                )}

                {/* 法要予約ボタン */}
                <div className="border-t border-stone-50 px-4 py-3">
                  <Link
                    href={`/app/reservations/new?deceasedPersonId=${d.id}&type=ANNUAL_MEMORIAL`}
                    className="flex items-center justify-between text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                  >
                    <span>年忌法要を予約する</span>
                    <ChevronRight size={16} className="text-amber-500" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
