import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/scoring";
import { MemberStage } from "@/generated/prisma/client";

const STAGES: MemberStage[] = ["GOEN", "PROSPECT", "DANKA_CANDIDATE", "DANKA"];

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

  // 各ステージのメンバー（上位10件 + 総数）
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

  // 直近30日間の遷移
  const recentTransitions = await prisma.stageTransition.findMany({
    where: {
      member: { templeId },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { member: { include: { user: { select: { name: true } } } } },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">パイプライン</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          会員のエンゲージメントステージを管理します
        </p>
      </div>

      {/* ステージサマリー */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stageData.map(({ stage, count }) => (
          <div key={stage} className="bg-white rounded-xl border border-stone-200 p-4">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${STAGE_COLORS[stage]}`}>
              {STAGE_LABELS[stage]}
            </span>
            <p className="text-3xl font-bold text-stone-800">{count}</p>
            <p className="text-xs text-stone-400 mt-0.5">名</p>
            {(stage === "GOEN" || stage === "PROSPECT" || stage === "DANKA_CANDIDATE") && (
              <p className="text-xs text-stone-400 mt-1">
                {stage === "GOEN" && `スコア ${thresholdGoen}〜`}
                {stage === "PROSPECT" && `スコア ${thresholdProspect}〜`}
                {stage === "DANKA_CANDIDATE" && `スコア ${thresholdCandidate}〜`}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* カンバンボード */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        {stageData.map(({ stage, members, count }) => (
          <div key={stage} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage]}`}>
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-stone-400">{count}名</span>
            </div>
            <div className="divide-y divide-stone-50">
              {members.length === 0 ? (
                <p className="px-4 py-6 text-xs text-stone-300 text-center">なし</p>
              ) : (
                members.map((m) => (
                  <Link
                    key={m.id}
                    href={`/admin/members/${m.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 text-xs font-bold shrink-0">
                        {m.user.name.charAt(0)}
                      </div>
                      <span className="text-sm text-stone-700 truncate">{m.user.name}</span>
                    </div>
                    <span className="text-xs text-stone-400 shrink-0 ml-2">{m.lifetimeScore}pt</span>
                  </Link>
                ))
              )}
            </div>
            {count > 8 && (
              <div className="px-4 py-2.5 border-t border-stone-50">
                <Link
                  href={`/admin/members?stage=${stage}`}
                  className="text-xs text-amber-700 hover:text-amber-900"
                >
                  他 {count - 8} 名を見る →
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 直近の遷移 */}
      {recentTransitions.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-700">直近のステージ変更（30日間）</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {recentTransitions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 text-xs font-bold shrink-0">
                  {t.member.user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-700">{t.member.user.name}</span>
                    <div className="flex items-center gap-1 text-xs">
                      {t.fromStage && (
                        <>
                          <span className={`px-1.5 py-0.5 rounded-full ${STAGE_COLORS[t.fromStage]}`}>
                            {STAGE_LABELS[t.fromStage]}
                          </span>
                          <span className="text-stone-400">→</span>
                        </>
                      )}
                      <span className={`px-1.5 py-0.5 rounded-full ${STAGE_COLORS[t.toStage]}`}>
                        {STAGE_LABELS[t.toStage]}
                      </span>
                    </div>
                    {t.triggeredBy === "AUTO" && (
                      <span className="text-xs text-stone-400">自動</span>
                    )}
                  </div>
                  {t.reason && (
                    <p className="text-xs text-stone-400 mt-0.5">{t.reason}</p>
                  )}
                </div>
                <span className="text-xs text-stone-400 shrink-0">
                  {t.createdAt.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
