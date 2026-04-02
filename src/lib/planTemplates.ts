export const PLAN_TEMPLATES = [
  {
    key: "BASIC",
    name: "年次サポートプラン",
    description: "お寺の活動を年1回のご支援で応援いただけるプランです",
    interval: "YEARLY" as const,
    defaultPrice: 3000,
    benefits: ["お知らせ・年間行事案内", "法要予約サービス", "年次活動報告書"],
    sortOrder: 0,
  },
  {
    key: "MONTHLY_SUPPORT",
    name: "月次サポートプラン",
    description: "毎月継続的にお寺をご支援いただけるプランです",
    interval: "MONTHLY" as const,
    defaultPrice: 500,
    benefits: ["お知らせ・年間行事案内", "法要予約サービス", "月次通信（メール）"],
    sortOrder: 1,
  },
  {
    key: "PREMIUM",
    name: "プレミアムサポートプラン",
    description: "より深くお寺とご縁を結んでいただくプレミアムプランです",
    interval: "YEARLY" as const,
    defaultPrice: 10000,
    benefits: ["お知らせ・年間行事案内", "法要予約優先対応", "月次通信（メール）", "特別法要ご招待"],
    sortOrder: 2,
  },
] as const;

export type PlanTemplateKey = (typeof PLAN_TEMPLATES)[number]["key"];

export function getPlanTemplate(key: string) {
  return PLAN_TEMPLATES.find((t) => t.key === key) ?? null;
}
