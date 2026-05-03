// ==========================================
// てらログ 型定義
// ==========================================

export type UserRole = "super_admin" | "admin" | "staff" | "member";

// イベントカテゴリ
export type EventCategory =
  | "zazen"
  | "shakyo"
  | "yoga"
  | "mindfulness"
  | "lecture"
  | "seasonal"
  | "other";

// イベント公開範囲 (v2)
export type EventVisibility = "public" | "followers_only";

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
  requiredRole?: UserRole[];
};
