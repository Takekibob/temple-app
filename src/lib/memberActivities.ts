import { prisma } from "@/lib/prisma";
import type { ActivityType } from "@/generated/prisma/enums";

/**
 * エンゲージメントスコア計算用のアクティビティを記録する。
 * 操作ログ（監査ログ）は src/lib/activityLog.ts の logActivity を使うこと。
 */
const ACTIVITY_POINTS: Record<ActivityType, number> = {
  LOGIN: 1,
  NEWS_VIEW: 2,
  EVENT_APPLY: 10,
  EVENT_ATTEND: 20,
  EVENT_FEEDBACK: 5,
  KUYO_APPLY: 30,
  CONTACT: 15,
  CONSECUTIVE_MONTH: 10,
  DONATION: 10,
  DONATION_LARGE: 30,
  SUBSCRIPTION_START: 15,
  REFERRAL: 20,
  LINE_MESSAGE_OPEN: 1,
};

export async function logMemberActivity(
  memberId: string,
  type: ActivityType,
  metadata?: Record<string, unknown>
) {
  const score = ACTIVITY_POINTS[type] ?? 0;
  await prisma.memberActivity.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { memberId, type, metadata: (metadata ?? undefined) as any, score },
  });
}
