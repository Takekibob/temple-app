export const PLAN_TEMPLATES = [
  {
    key: "MONTHLY",
    name: "会員プラン（月払い）",
    description: "月払いで気軽にお寺を応援いただけるプランです",
    interval: "MONTHLY" as const,
    defaultPrice: 500,
    benefits: [
      "お知らせ・年間行事案内",
      "法要予約サービス",
      "イベント参加（会員限定を含む）",
      "会員限定ブログ・コンテンツの閲覧",
    ],
    sortOrder: 0,
  },
  {
    key: "ANNUAL",
    name: "会員プラン（年払い・お得）",
    description: "年払いでお得にご加入いただけるプランです（月払いより約2ヶ月分お得）",
    interval: "YEARLY" as const,
    defaultPrice: 5000,
    benefits: [
      "お知らせ・年間行事案内",
      "法要予約サービス",
      "イベント参加（会員限定を含む）",
      "会員限定ブログ・コンテンツの閲覧",
    ],
    sortOrder: 1,
  },
] as const;

export type PlanTemplateKey = (typeof PLAN_TEMPLATES)[number]["key"];

export function getPlanTemplate(key: string) {
  return PLAN_TEMPLATES.find((t) => t.key === key) ?? null;
}
