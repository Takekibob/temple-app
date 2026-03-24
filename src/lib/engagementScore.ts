/**
 * エンゲージメントスコア計算ロジック
 * 設計書 §16 に基づく
 */

export type ActionType =
  | "app_login"
  | "news_view"
  | "event_apply"
  | "event_attended"
  | "event_feedback"
  | "kuyo_apply"
  | "contact_sent"
  | "consecutive_events_bonus";

export interface EngagementAction {
  type: ActionType;
  timestamp: Date;
}

/** 行動別ポイント（設計書 §16.2） */
export const ACTION_POINTS: Record<ActionType, number> = {
  app_login: 1,
  news_view: 2,
  event_apply: 10,
  event_attended: 15,
  event_feedback: 5,
  kuyo_apply: 20,
  contact_sent: 5,
  consecutive_events_bonus: 10,
};

/**
 * 時間減衰係数を計算する（設計書 §16.3）
 * decay = e^(-0.05 * elapsed_days)
 */
export function calcDecay(timestamp: Date, now: Date = new Date()): number {
  const elapsedDays =
    (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-0.05 * elapsedDays);
}

/**
 * エンゲージメントスコアを計算する（0〜100）
 * 各行動のポイントに時間減衰をかけて合計し、100 でキャップ
 */
export function calcEngagementScore(
  actions: EngagementAction[],
  now: Date = new Date()
): number {
  const raw = actions.reduce((sum, action) => {
    const points = ACTION_POINTS[action.type] ?? 0;
    const decay = calcDecay(action.timestamp, now);
    return sum + points * decay;
  }, 0);

  return Math.min(100, Math.round(raw));
}

/**
 * スコアに応じたラベルと転換候補フラグを返す（設計書 §16.4）
 */
export function scoreToLabel(score: number): {
  label: "低" | "中" | "高" | "最高";
  isConversionCandidate: boolean;
} {
  if (score >= 80) return { label: "最高", isConversionCandidate: true };
  if (score >= 50) return { label: "高", isConversionCandidate: true };
  if (score >= 20) return { label: "中", isConversionCandidate: false };
  return { label: "低", isConversionCandidate: false };
}
