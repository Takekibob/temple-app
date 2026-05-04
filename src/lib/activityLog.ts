import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type LogAction =
  | "create"
  | "update"
  | "delete"
  | "export"
  | "import"
  | "login"
  | "logout"
  | "view_sensitive";

export type LogTargetType =
  | "member"
  | "event"
  | "settings"
  | "announcement"
  | "staff";

export interface LogOptions {
  templeId: string;
  userId?: string;
  action: LogAction;
  targetType?: LogTargetType;
  targetId?: string;
  targetName?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * 操作ログを記録する。失敗してもメイン処理には影響しない。
 */
export async function logActivity(opts: LogOptions): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        templeId: opts.templeId,
        userId: opts.userId ?? null,
        action: opts.action,
        targetType: opts.targetType ?? null,
        targetId: opts.targetId ?? null,
        targetName: opts.targetName ?? null,
        detail: opts.detail ? (opts.detail as Prisma.InputJsonValue) : undefined,
        ipAddress: opts.ipAddress ?? null,
      },
    });
  } catch {
    // ログ失敗はサイレントに握りつぶす（メイン処理を止めない）
  }
}

export const ACTION_LABELS: Record<LogAction, string> = {
  create: "作成",
  update: "更新",
  delete: "削除",
  export: "エクスポート",
  import: "インポート",
  login: "ログイン",
  logout: "ログアウト",
  view_sensitive: "機密閲覧",
};

export const TARGET_LABELS: Record<LogTargetType, string> = {
  member: "会員",
  event: "イベント",
  settings: "設定",
  announcement: "お知らせ",
  staff: "スタッフ",
};
