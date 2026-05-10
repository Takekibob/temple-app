import { Circle, Feather, Leaf, Flame, GraduationCap, Flower2, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

/** 標準カテゴリのアイコンマップ (Lucide React コンポーネント) */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  ZAZEN: Circle,
  SHAKYO: Feather,
  YOGA: Leaf,
  MINDFULNESS: Flame,
  LECTURE: GraduationCap,
  SEASONAL: Flower2,
  OTHER: MoreHorizontal,
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
 * カテゴリ値から Lucide アイコンコンポーネントを返す。
 * カスタムカテゴリは MoreHorizontal を返す。
 */
export function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? MoreHorizontal;
}

/**
 * カテゴリが標準カテゴリかどうかを判定する。
 */
export function isStandardCategory(category: string): boolean {
  return (STANDARD_CATEGORY_KEYS as readonly string[]).includes(category);
}
