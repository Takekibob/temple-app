import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SCORES, ACTIVITY_TYPE_LABELS, STAGE_THRESHOLDS, STAGE_LABELS } from "@/lib/scoring";
import ScoringClient from "./ScoringClient";

export default async function ScoringSettingsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");
  if (authUser.role === "STAFF") redirect("/admin");

  const rules = await prisma.scoringRule.findMany({
    where: { templeId: authUser.templeId },
  });

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
          各アクティビティに付与するポイントを設定します
        </p>
      </div>

      {/* ステージ閾値（読み取り専用） */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">ステージ自動昇格の閾値</h2>
        <div className="space-y-2">
          {(["PROSPECT", "DANKA_CANDIDATE"] as const).map((stage) => (
            <div key={stage} className="flex items-center justify-between text-sm">
              <span className="text-stone-600">
                {STAGE_LABELS[stage]} へ昇格
              </span>
              <span className="font-medium text-stone-800">
                {STAGE_THRESHOLDS[stage]} ポイント以上
              </span>
            </div>
          ))}
          <p className="text-xs text-stone-400 mt-2">
            ※ 檀家への昇格は手動で行います
          </p>
        </div>
      </div>

      <ScoringClient
        initialScores={initialScores}
        activityLabels={ACTIVITY_TYPE_LABELS}
      />
    </div>
  );
}
