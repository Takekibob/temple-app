import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextNenki } from "@/lib/nenki";

export default async function UserDeceasedPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  // 檀家のみアクセス可
  if (!authUser.member || authUser.member.type !== "DANKA") {
    redirect("/app");
  }

  const deceasedList = await prisma.deceasedPerson.findMany({
    where: { memberId: authUser.member.id },
    orderBy: { deathDate: "desc" },
  });

  return (
    <div className="pb-4">
      {/* ヘッダー */}
      <div className="bg-white border-b border-stone-100 px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-stone-800">過去帳</h1>
        <p className="text-sm text-stone-500 mt-0.5">ご先祖様の法要情報</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {deceasedList.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
            <p className="text-stone-500 text-sm">過去帳への登録はお寺にご依頼ください</p>
            <p className="text-stone-400 text-xs mt-2">
              ご先祖様の戒名・没年月日・年忌法要の管理をお手伝いします
            </p>
          </div>
        ) : (
          deceasedList.map((d) => {
            const nextNenki = d.deathDate ? getNextNenki(d.deathDate) : null;
            return (
              <div key={d.id} className="bg-white rounded-xl border border-stone-200 p-4">
                {/* 故人情報 */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-bold text-stone-800 text-lg">{d.name}</h2>
                    {d.relationship && (
                      <span className="text-xs text-stone-400">{d.relationship}</span>
                    )}
                  </div>
                  {d.age && (
                    <span className="text-xs text-stone-400">享年 {d.age} 歳</span>
                  )}
                </div>

                <div className="space-y-1.5 text-sm mb-4">
                  {d.kaimyo && (
                    <div className="flex gap-3">
                      <span className="text-stone-400 w-12 flex-shrink-0">戒名</span>
                      <span className="text-stone-700">{d.kaimyo}</span>
                    </div>
                  )}
                  {d.deathDate && (
                    <div className="flex gap-3">
                      <span className="text-stone-400 w-12 flex-shrink-0">没年月日</span>
                      <span className="text-stone-700">
                        {d.deathDate.toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* 次回年忌 */}
                {nextNenki ? (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 mb-3">
                    <p className="text-xs text-stone-500 mb-0.5">次回の年忌</p>
                    <p className="text-sm font-semibold text-amber-800">
                      {nextNenki.name}
                      <span className="ml-2 font-normal text-stone-600">
                        {nextNenki.date.toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-stone-400">年忌はすべて終えられました</p>
                  </div>
                )}

                {/* 法要予約ボタン */}
                <Link
                  href={`/app/reservations/new?deceasedPersonId=${d.id}&type=ANNUAL_MEMORIAL`}
                  className="block w-full text-center py-2.5 px-4 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  年忌法要を予約する
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
