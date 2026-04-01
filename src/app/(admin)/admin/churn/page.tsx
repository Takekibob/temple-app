import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 離脱とみなす閾値（月）
const THRESHOLDS = [
  { months: 6, label: "6ヶ月以上", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { months: 12, label: "1年以上", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { months: 24, label: "2年以上", color: "bg-red-100 text-red-800 border-red-200" },
];

export default async function ChurnAlertPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { months: monthsStr = "12" } = await searchParams;
  const months = [6, 12, 24].includes(Number(monthsStr)) ? Number(monthsStr) : 12;
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - months);

  // 最終接触日が閾値以前、または接触記録がなく登録から閾値以上経過した会員
  const members = await prisma.member.findMany({
    where: {
      templeId: authUser.templeId,
      OR: [
        { lastContactAt: { lte: threshold } },
        { lastContactAt: null, createdAt: { lte: threshold } },
      ],
    },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: [
      { lastContactAt: "asc" },  // 最も古い接触から上に
    ],
    take: 100,
  });

  // 分類
  const now = new Date();
  const withMeta = members.map((m) => {
    const lastDate = m.lastContactAt ?? m.createdAt;
    const monthsAgo = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return { member: m, monthsAgo, lastDate };
  });

  const counts = {
    6: withMeta.filter((m) => m.monthsAgo >= 6).length,
    12: withMeta.filter((m) => m.monthsAgo >= 12).length,
    24: withMeta.filter((m) => m.monthsAgo >= 24).length,
  } as Record<number, number>;

  const filtered = withMeta.filter((m) => m.monthsAgo >= months);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">離脱予兆アラート</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            一定期間接触がない会員を検出します。対応履歴・予約・お布施の記録から算出。
          </p>
        </div>
        <Link href="/admin/members" className="text-xs text-amber-700 hover:underline">
          会員一覧 →
        </Link>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {THRESHOLDS.map((t) => (
          <a
            key={t.months}
            href={`?months=${t.months}`}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              months === t.months ? t.color : "bg-white border-stone-200 hover:bg-stone-50"
            }`}
          >
            <p className="text-xs text-stone-500 mb-1">{t.label}未接触</p>
            <p className={`text-3xl font-bold ${months === t.months ? "" : "text-stone-800"}`}>
              {counts[t.months] ?? 0}
            </p>
            <p className="text-xs mt-1 opacity-70">名</p>
          </a>
        ))}
      </div>

      {/* 会員リスト */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-800">
            {THRESHOLDS.find((t) => t.months === months)?.label}未接触の会員
            <span className="ml-2 text-sm font-normal text-stone-500">{filtered.length}名</span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-12 text-stone-400 text-sm">対象の会員はいません</p>
        ) : (
          <ul className="divide-y divide-stone-50">
            {filtered.map(({ member, monthsAgo, lastDate }) => (
              <li key={member.id}>
                <Link
                  href={`/admin/members/${member.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-800">{member.user.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        member.type === "DANKA"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-teal-100 text-teal-800"
                      }`}>
                        {member.type === "DANKA" ? "檀家" : "ご縁さん"}
                      </span>
                    </div>
                    {member.familyName && (
                      <p className="text-xs text-stone-500 mt-0.5">{member.familyName}家</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-sm font-semibold ${
                      monthsAgo >= 24 ? "text-red-600" :
                      monthsAgo >= 12 ? "text-orange-600" :
                      "text-amber-600"
                    }`}>
                      {monthsAgo}ヶ月前
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {lastDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    {!member.lastContactAt && (
                      <p className="text-xs text-stone-300 mt-0.5">※接触記録なし</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-stone-400 mt-4">
        ※「最終接触日」は、対応履歴メモの作成・法要予約の新規作成のいずれかの最新日時を使用しています。
        接触記録がない場合は会員登録日を起点とします。
      </p>
    </div>
  );
}
