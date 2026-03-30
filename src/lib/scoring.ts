import { prisma } from "@/lib/prisma";
import { MemberStage } from "@/generated/prisma/client";

// 純粋な定数は scoringMeta.ts で管理（Client Component からも安全にインポート可）
export {
  DEFAULT_SCORES,
  ACTIVITY_TYPE_LABELS,
  STAGE_THRESHOLDS,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/lib/scoringMeta";
import { DEFAULT_SCORES, STAGE_THRESHOLDS } from "@/lib/scoringMeta";

/**
 * お寺のスコアリングルールを取得（未設定分はデフォルトで補完）
 */
export async function getTempleScores(templeId: string): Promise<Record<string, number>> {
  const rules = await prisma.scoringRule.findMany({
    where: { templeId, isActive: true },
  });
  const ruleMap: Record<string, number> = {};
  for (const r of rules) {
    ruleMap[r.activityType] = r.score;
  }
  // デフォルトで補完
  const result = { ...DEFAULT_SCORES };
  for (const [k, v] of Object.entries(ruleMap)) {
    result[k] = v;
  }
  return result;
}

/**
 * スコアを付与し、lifetimeScore / engagementScore を更新。
 * ステージ自動遷移も評価する。
 * 失敗してもメイン処理を止めない。
 */
export async function awardScore(opts: {
  memberId: string;
  templeId: string;
  activityType: string;
  sourceId?: string;
  note?: string;
}): Promise<void> {
  try {
    const scores = await getTempleScores(opts.templeId);
    const score = scores[opts.activityType] ?? 0;
    if (score === 0) return;

    // スコアイベントを記録
    await prisma.scoringEvent.create({
      data: {
        memberId: opts.memberId,
        activityType: opts.activityType,
        score,
        sourceId: opts.sourceId ?? null,
        note: opts.note ?? null,
      },
    });

    // Member のスコアを加算・lastActivityAt を更新
    const updated = await prisma.member.update({
      where: { id: opts.memberId },
      data: {
        engagementScore: { increment: score },
        lifetimeScore: { increment: score },
        lastActivityAt: new Date(),
      },
    });

    // ステージ自動遷移を評価（DANKAは手動昇格のみ）
    await evaluateStageTransition(updated.id, updated.stage, updated.lifetimeScore);
  } catch {
    // サイレントに握りつぶす
  }
}

/**
 * lifetimeScore に基づきステージ遷移を評価する。
 * DANKA への昇格は行わない（手動のみ）。
 */
export async function evaluateStageTransition(
  memberId: string,
  currentStage: MemberStage,
  lifetimeScore: number
): Promise<void> {
  let nextStage: MemberStage | null = null;

  if (currentStage === "GOEN" && lifetimeScore >= (STAGE_THRESHOLDS.PROSPECT ?? 10)) {
    nextStage = "PROSPECT";
  } else if (currentStage === "PROSPECT" && lifetimeScore >= (STAGE_THRESHOLDS.DANKA_CANDIDATE ?? 50)) {
    nextStage = "DANKA_CANDIDATE";
  }

  if (!nextStage) return;

  await prisma.$transaction([
    prisma.member.update({
      where: { id: memberId },
      data: { stage: nextStage, stageChangedAt: new Date(), stageChangedBy: "AUTO" },
    }),
    prisma.stageTransition.create({
      data: {
        memberId,
        fromStage: currentStage,
        toStage: nextStage,
        triggeredBy: "AUTO",
        reason: `lifetimeScore >= ${STAGE_THRESHOLDS[nextStage]}`,
      },
    }),
  ]);
}

/**
 * 手動ステージ変更（スタッフ操作）
 */
export async function changeStage(opts: {
  memberId: string;
  toStage: MemberStage;
  triggeredBy: string;
  reason?: string;
}): Promise<void> {
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: opts.memberId },
    select: { stage: true },
  });

  const now = new Date();
  // Phase C: stage=DANKA のときは type も同期する
  const typeSync = opts.toStage === "DANKA" ? { type: "DANKA" as const, promotedAt: now } : {};

  await prisma.$transaction([
    prisma.member.update({
      where: { id: opts.memberId },
      data: {
        stage: opts.toStage,
        stageChangedAt: now,
        stageChangedBy: opts.triggeredBy,
        ...typeSync,
      },
    }),
    prisma.stageTransition.create({
      data: {
        memberId: opts.memberId,
        fromStage: member.stage,
        toStage: opts.toStage,
        triggeredBy: opts.triggeredBy,
        reason: opts.reason ?? null,
      },
    }),
  ]);
}
