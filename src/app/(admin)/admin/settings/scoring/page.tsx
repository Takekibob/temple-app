import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SCORES, ACTIVITY_TYPE_LABELS } from "@/lib/scoring";
import ScoringClient from "./ScoringClient";
import ThresholdClient from "./ThresholdClient";

export default async function ScoringSettingsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");
  if (authUser.role === "STAFF") redirect("/admin");

  const [rules, temple] = await Promise.all([
    prisma.scoringRule.findMany({ where: { templeId: authUser.templeId } }),
    prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: { thresholdGoen: true, thresholdProspect: true, thresholdCandidate: true, dankaGoalAnnual: true },
    }),
  ]);

  const ruleMap: Record<string, number> = {};
  for (const r of rules) {
    ruleMap[r.activityType] = r.score;
  }

  // merge defaults with saved values
  const initialScores: Record<string, number> = {};
  for (const [activityType, defaultScore] of Object.entries(DEFAULT_SCORES)) {
    initialScores[activityType] = ruleMap[activityType] ?? defaultScore;
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <a href="/admin/settings" className="text-sm text-stone-400 hover:text-stone-600 inline-block mb-2">
          ← 設定へ戻る
        </a>
        <h1 className="text-2xl font-bold text-stone-800">スコアリング設定</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          各アクティビティに付与するポイント・ステージ閾値を設定します
        </p>
      </div>

      {/* ステージ閾値カスタマイズ（編集可能） */}
      <ThresholdClient
        initialThresholds={{
          thresholdGoen: temple?.thresholdGoen ?? 10,
          thresholdProspect: temple?.thresholdProspect ?? 50,
          thresholdCandidate: temple?.thresholdCandidate ?? 80,
          dankaGoalAnnual: temple?.dankaGoalAnnual ?? null,
        }}
      />

      <ScoringClient
        initialScores={initialScores}
        activityLabels={ACTIVITY_TYPE_LABELS}
      />
    </div>
  );
}
