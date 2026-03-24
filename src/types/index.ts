// ==========================================
// てらログ 型定義
// ==========================================

export type MemberType = "danka" | "goen";
export type UserRole = "super_admin" | "admin" | "staff" | "member";

// 会員タイプ別 UI 制御
export type UiContext = "danka" | "goen" | "admin";

// イベントカテゴリ
export type EventCategory =
  | "zazen"
  | "shakyo"
  | "yoga"
  | "mindfulness"
  | "lecture"
  | "seasonal"
  | "other";

// イベント公開範囲
export type EventVisibility = "public" | "members_only" | "danka_only";

// 予約タイプ
export type ReservationType =
  | "annual_memorial"
  | "monthly_memorial"
  | "nibon"
  | "kuyo"
  | "funeral"
  | "other";

// お布施タイプ
export type OfuseType = "houyo" | "gojikai" | "kifu" | "event_fee" | "other";

// APIエラーレスポンス
export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

// ナビゲーションアイテム
export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  requiredType?: MemberType;
  requiredRole?: UserRole[];
};

// エンゲージメントスコアのラベル
export type EngagementLabel = "低" | "中" | "高" | "最高";

export function getEngagementLabel(score: number): EngagementLabel {
  if (score < 20) return "低";
  if (score < 50) return "中";
  if (score < 80) return "高";
  return "最高";
}
