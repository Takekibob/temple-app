/** 標準カテゴリのキー一覧 */
export const STANDARD_CATEGORY_KEYS = [
  "ZAZEN",
  "SHAKYO",
  "YOGA",
  "MINDFULNESS",
  "LECTURE",
  "SEASONAL",
  "OTHER",
] as const;

export type StandardCategoryKey = (typeof STANDARD_CATEGORY_KEYS)[number];

/** 標準カテゴリのラベルマップ */
export const STANDARD_CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅",
  SHAKYO: "写経",
  YOGA: "ヨガ",
  MINDFULNESS: "マインドフルネス",
  LECTURE: "仏事講座",
  SEASONAL: "季節行事",
  OTHER: "その他",
};

/** 標準カテゴリのアイコンマップ */
export const CATEGORY_ICONS: Record<string, string> = {
  ZAZEN: "🧘",
  SHAKYO: "✍️",
  YOGA: "🌿",
  MINDFULNESS: "🕯️",
  LECTURE: "📖",
  SEASONAL: "🌸",
  OTHER: "🎋",
};

/** フォーム用: 標準カテゴリの選択肢 */
export const STANDARD_CATEGORY_OPTIONS = STANDARD_CATEGORY_KEYS.map((key) => ({
  value: key,
  label: STANDARD_CATEGORY_LABELS[key],
}));

/**
 * カテゴリ値から表示ラベルを返す。
 * - 標準カテゴリ（"ZAZEN" 等）→ 日本語ラベル
 * - カスタムカテゴリ（日本語名）→ そのまま返す
 */
export function getCategoryLabel(category: string): string {
  return STANDARD_CATEGORY_LABELS[category] ?? category;
}

/**
 * カテゴリ値からアイコンを返す。
 * カスタムカテゴリのアイコンは固定で 🎋 を返す。
 */
export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "🎋";
}

/**
 * カテゴリが標準カテゴリかどうかを判定する。
 */
export function isStandardCategory(category: string): boolean {
  return (STANDARD_CATEGORY_KEYS as readonly string[]).includes(category);
}
