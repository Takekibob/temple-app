export const ARTICLE_CATEGORIES = [
  { value: "PARTICIPATION", label: "参拝の作法" },
  { value: "DENOMINATION",  label: "宗派について" },
  { value: "CEREMONY",      label: "行事・節句" },
  { value: "PRACTICE",      label: "坐禅・写経等の実践" },
  { value: "OTHER",         label: "その他" },
] as const;

export type ArticleCategoryValue = (typeof ARTICLE_CATEGORIES)[number]["value"];

export function getArticleCategoryLabel(value: string): string {
  return ARTICLE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/** 日本語タイトルから URL-safe な slug を生成 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s　]+/g, "-")      // 空白→ハイフン
    .replace(/[^a-z0-9\-ぁ-ん一-龯]/g, "") // 英数・ひらがな・漢字以外を除去
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
