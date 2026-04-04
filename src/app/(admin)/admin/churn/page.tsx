import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AlertTriangle, ChevronRight, Users } from "lucide-react";

const THRESHOLDS = [
  { months: 6, label: "6ヶ月以上", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { months: 12, label: "1年以上", color: "bg-orange-50 border-orange-200 text-orange-800" },
  { months: 24, label: "2年以上", color: "bg-red-50 border-red-200 text-red-800" },
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
    orderBy: [{ lastContactAt: "asc" }],
    take: 100,
  });

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
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <AlertTriangle size={18} className="text-amber-700" />
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">離脱予兆アラート</h1>
        </div>
        <p className="text-sm text-stone-400">
          一定期間接触がない会員を検出します。対応履歴・予約・お布施の記録から算出。
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {THRESHOLDS.map((t) => (
          <Link
            key={t.months}
            href={`/admin/churn?months=${t.months}`}
            className={`rounded-2xl border p-4 transition-all hover:shadow-md ${
              months === t.months
                ? t.color
                : "bg-white border-stone-100 shadow-sm hover:border-amber-200"
            }`}
          >
            <p className={`text-xs font-medium mb-1 ${months === t.months ? "" : "text-stone-500"}`}>
              {t.label}未接触
            </p>
            <p className={`text-3xl font-bold ${months === t.months ? "" : "text-stone-800"}`}>
              {counts[t.months] ?? 0}
            </p>
            <p className="text-xs mt-1 opacity-70">名</p>
          </Link>
        ))}
      </div>

      {/* 会員リスト */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-stone-400" />
            <h2 className="text-sm font-bold text-stone-700">
              {THRESHOLDS.find((t) => t.months === months)?.label}未接触の会員
              <span className="ml-2 text-xs font-normal text-stone-400">{filtered.length}名</span>
            </h2>
          </div>
          <Link href="/admin/members" className="text-xs text-amber-700 hover:text-amber-900 font-medium">
            会員一覧 →
          </Link>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-12 text-stone-400 text-sm">対象の会員はいません</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {filtered.map(({ member, monthsAgo, lastDate }) => (
              <Link
                key={member.id}
                href={`/admin/members/${member.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                    monthsAgo >= 24 ? "bg-red-500" : monthsAgo >= 12 ? "bg-orange-500" : "bg-amber-500"
                  }`}>
                    {member.user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-stone-800 text-sm">{member.user.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        member.type === "DANKA"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-teal-100 text-teal-800"
                      }`}>
                        {member.type === "DANKA" ? "檀家" : "ご縁さん"}
                      </span>
                    </div>
                    {member.familyName && (
                      <p className="text-xs text-stone-400 mt-0.5">{member.familyName}家</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      monthsAgo >= 24 ? "text-red-600" :
                      monthsAgo >= 12 ? "text-orange-600" :
                      "text-amber-600"
                    }`}>
                      {monthsAgo}ヶ月前
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {lastDate.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    {!member.lastContactAt && (
                      <p className="text-xs text-stone-300 mt-0.5">接触記録なし</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-stone-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-stone-400 mt-4">
        ※「最終接触日」は、対応履歴メモの作成・法要予約の新規作成のいずれかの最新日時を使用しています。
        接触記録がない場合は会員登録日を起点とします。
      </p>
    </div>
  );
}
