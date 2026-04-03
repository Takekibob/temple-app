import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/scoring";
import { MemberStage } from "@/generated/prisma/client";
import { ArrowRight, TrendingUp } from "lucide-react";

const STAGES: MemberStage[] = ["GOEN", "PROSPECT", "DANKA_CANDIDATE", "DANKA"];

const STAGE_ICONS: Record<string, string> = {
  GOEN: "🌱",
  PROSPECT: "👀",
  DANKA_CANDIDATE: "⭐",
  DANKA: "🏯",
};

export default async function PipelinePage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const templeId = authUser.templeId;

  const temple = await prisma.temple.findUnique({
    where: { id: templeId },
    select: { thresholdGoen: true, thresholdProspect: true, thresholdCandidate: true },
  });
  const thresholdGoen = temple?.thresholdGoen ?? 10;
  const thresholdProspect = temple?.thresholdProspect ?? 50;
  const thresholdCandidate = temple?.thresholdCandidate ?? 80;

  const stageData = await Promise.all(
    STAGES.map(async (stage) => {
      const [members, count] = await Promise.all([
        prisma.member.findMany({
          where: { templeId, stage },
          orderBy: { lifetimeScore: "desc" },
          take: 8,
          include: { user: { select: { name: true } } },
        }),
        prisma.member.count({ where: { templeId, stage } }),
      ]);
      return { stage, members, count };
    })
  );

  const recentTransitions = await prisma.stageTransition.findMany({
    where: {
      member: { templeId },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { member: { include: { user: { select: { name: true } } } } },
  });

  const thresholds: Record<string, string> = {
    GOEN: `スコア ${thresholdGoen}〜`,
    PROSPECT: `スコア ${thresholdProspect}〜`,
    DANKA_CANDIDATE: `スコア ${thresholdCandidate}〜`,
    DANKA: "登録済み",
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* ヘッダー */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <TrendingUp size={18} className="text-amber-700" />
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">パイプライン</h1>
        </div>
        <p className="text-sm text-stone-400">会員のエンゲージメントステージを管理します</p>
      </div>

      {/* ステージサマリー */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stageData.map(({ stage, count }) => (
          <Link key={stage} href={`/admin/members?stage=${stage}`}
            className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 hover:border-amber-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{STAGE_ICONS[stage]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STAGE_COLORS[stage]}`}>
                {STAGE_LABELS[stage]}
              </span>
            </div>
            <p className="text-3xl font-bold text-stone-800">{count}</p>
            <p className="text-xs text-stone-400 mt-0.5">{thresholds[stage]}</p>
          </Link>
        ))}
      </div>

      {/* カンバンボード */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
        {stageData.map(({ stage, members, count }) => (
          <div key={stage} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{STAGE_ICONS[stage]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STAGE_COLORS[stage]}`}>
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              <span className="text-xs text-stone-400 font-medium">{count}名</span>
            </div>
            <div className="divide-y divide-stone-50">
              {members.length === 0 ? (
                <p className="px-4 py-6 text-xs text-stone-300 text-center">なし</p>
              ) : (
                members.map((m) => (
                  <Link key={m.id} href={`/admin/members/${m.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                        stage === "DANKA" ? "bg-amber-700" : "bg-teal-600"
                      }`}>
                        {m.user.name.charAt(0)}
                      </div>
                      <span className="text-sm text-stone-700 truncate">{m.user.name}</span>
                    </div>
                    <span className="text-xs text-stone-400 shrink-0 ml-2 font-medium">{m.lifetimeScore}pt</span>
                  </Link>
                ))
              )}
            </div>
            {count > 8 && (
              <div className="px-4 py-2.5 border-t border-stone-50">
                <Link href={`/admin/members?stage=${stage}`}
                  className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1">
                  他 {count - 8} 名を見る <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 直近の遷移 */}
      {recentTransitions.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-50 flex items-center gap-2">
            <TrendingUp size={14} className="text-amber-600" />
            <h2 className="text-sm font-bold text-stone-700">直近のステージ変更（30日間）</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {recentTransitions.map((t) => (
              <Link key={t.id} href={`/admin/members/${t.memberId}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 text-sm font-bold shrink-0">
                  {t.member.user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-stone-700">{t.member.user.name}</span>
                    <div className="flex items-center gap-1 text-xs">
                      {t.fromStage && (
                        <>
                          <span className={`px-1.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[t.fromStage]}`}>
                            {STAGE_LABELS[t.fromStage]}
                          </span>
                          <ArrowRight size={11} className="text-stone-400" />
                        </>
                      )}
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${STAGE_COLORS[t.toStage]}`}>
                        {STAGE_LABELS[t.toStage]}
                      </span>
                      {t.triggeredBy === "AUTO" && (
                        <span className="text-stone-400">自動</span>
                      )}
                    </div>
                  </div>
                  {t.reason && <p className="text-xs text-stone-400 mt-0.5 truncate">{t.reason}</p>}
                </div>
                <span className="text-xs text-stone-400 shrink-0">
                  {t.createdAt.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
