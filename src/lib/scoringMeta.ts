/**
 * スコアリング・ステージ関連の純粋な定数。
 * Prisma に依存しないため Client Component からも安全にインポートできる。
 */
import { MemberStage } from "@/generated/prisma/client";

export const DEFAULT_SCORES: Record<string, number> = {
  LOGIN: 1,
  NEWS_VIEW: 1,
  EVENT_APPLY: 5,
  EVENT_ATTEND: 10,
  EVENT_FEEDBACK: 3,
  KUYO_APPLY: 20,
  CONTACT: 5,
  CONSECUTIVE_MONTH: 5,
  // v2追加
  DONATION: 10,
  DONATION_LARGE: 30,
  SUBSCRIPTION_START: 15,
  REFERRAL: 20,
  LINE_MESSAGE_OPEN: 1,
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  LOGIN: "ログイン",
  NEWS_VIEW: "お知らせ閲覧",
  EVENT_APPLY: "イベント申込",
  EVENT_ATTEND: "イベント参加",
  EVENT_FEEDBACK: "フィードバック",
  KUYO_APPLY: "法要予約",
  CONTACT: "問い合わせ",
  CONSECUTIVE_MONTH: "連続月アクティブ",
  // v2追加
  DONATION: "寄付",
  DONATION_LARGE: "高額寄付",
  SUBSCRIPTION_START: "サブスク開始",
  REFERRAL: "紹介",
  LINE_MESSAGE_OPEN: "LINEメッセージ開封",
};

export const STAGE_THRESHOLDS: Partial<Record<MemberStage, number>> = {
  PROSPECT: 10,
  DANKA_CANDIDATE: 50,
};

export const STAGE_LABELS: Record<MemberStage, string> = {
  GOEN: "ご縁さん",
  PROSPECT: "見込み",
  DANKA_CANDIDATE: "檀家候補",
  DANKA: "檀家",
};

export const STAGE_COLORS: Record<MemberStage, string> = {
  GOEN: "bg-teal-100 text-teal-800",
  PROSPECT: "bg-blue-100 text-blue-800",
  DANKA_CANDIDATE: "bg-amber-100 text-amber-800",
  DANKA: "bg-rose-100 text-rose-800",
};
