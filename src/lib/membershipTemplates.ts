/**
 * メンバーシップ初期テンプレート定義
 *
 * お寺管理者がセットアップウィザードで選択できる5種類のプリセット。
 * 選択すると MembershipType（+ MembershipStage）が自動生成される。
 */

export type MembershipTypeTemplate = {
  name: string;
  description: string;
  pricingModel: "FREE" | "ONE_TIME" | "SUBSCRIPTION" | "DONATION";
  priceJpy?: number;
  billingCycle?: "MONTHLY" | "YEARLY";
  isPublic: boolean;
  sortOrder: number;
  stages: { name: string; order: number }[];
};

export type SetupTemplate = {
  key: string;
  label: string;
  description: string;
  emoji: string;
  useCases: string[];
  membershipTypes: MembershipTypeTemplate[];
};

export const SETUP_TEMPLATES: SetupTemplate[] = [
  {
    key: "traditional",
    label: "伝統型",
    description: "檀家・総代など伝統的な寺院組織向け",
    emoji: "⛩️",
    useCases: ["菩提寺", "檀家制度を持つお寺", "法要・供養中心"],
    membershipTypes: [
      {
        name: "檀家",
        description: "法要・過去帳・護持会費などの仏事フル機能を利用できる会員",
        pricingModel: "FREE",
        isPublic: true,
        sortOrder: 0,
        stages: [
          { name: "新規", order: 0 },
          { name: "アクティブ", order: 1 },
          { name: "コア", order: 2 },
        ],
      },
      {
        name: "総代",
        description: "寺院運営を補佐する役職会員",
        pricingModel: "FREE",
        isPublic: false,
        sortOrder: 1,
        stages: [],
      },
    ],
  },
  {
    key: "modern",
    label: "モダン型",
    description: "多様な関わり方を提供するコミュニティ志向のお寺向け",
    emoji: "🌿",
    useCases: ["都市型のお寺", "イベント・体験重視", "若年層の取り込み"],
    membershipTypes: [
      {
        name: "ご縁さん",
        description: "イベント・ブログ・お知らせが届く基本会員",
        pricingModel: "FREE",
        isPublic: true,
        sortOrder: 0,
        stages: [
          { name: "はじめて", order: 0 },
          { name: "リピーター", order: 1 },
          { name: "コア", order: 2 },
        ],
      },
      {
        name: "月額サポーター",
        description: "月額支援で限定コンテンツ・優先参加権を得られる会員",
        pricingModel: "SUBSCRIPTION",
        priceJpy: 500,
        billingCycle: "MONTHLY",
        isPublic: true,
        sortOrder: 1,
        stages: [
          { name: "サポーター", order: 0 },
          { name: "プレミアムサポーター", order: 1 },
        ],
      },
      {
        name: "写経会員",
        description: "写経イベントに優先参加できる会員",
        pricingModel: "FREE",
        isPublic: true,
        sortOrder: 2,
        stages: [],
      },
    ],
  },
  {
    key: "tourism",
    label: "観光寺型",
    description: "拝観・巡礼を中心とした観光寺院向け",
    emoji: "🏯",
    useCases: ["観光地のお寺", "多くの参拝者", "パスポート・年間パス販売"],
    membershipTypes: [
      {
        name: "拝観者",
        description: "一般拝観者（登録不要でも利用可能）",
        pricingModel: "FREE",
        isPublic: true,
        sortOrder: 0,
        stages: [],
      },
      {
        name: "年間パス",
        description: "年間拝観パスを購入した会員",
        pricingModel: "ONE_TIME",
        priceJpy: 3000,
        isPublic: true,
        sortOrder: 1,
        stages: [],
      },
      {
        name: "巡礼会員",
        description: "巡礼路の公式会員",
        pricingModel: "FREE",
        isPublic: true,
        sortOrder: 2,
        stages: [
          { name: "巡礼中", order: 0 },
          { name: "結願", order: 1 },
        ],
      },
    ],
  },
  {
    key: "small",
    label: "小規模寺型",
    description: "シンプルな運営をするお寺向け（ご縁さんのみ）",
    emoji: "🌸",
    useCases: ["小規模なお寺", "複雑な管理が不要", "まずは始めたい"],
    membershipTypes: [
      {
        name: "ご縁さん",
        description: "お寺とご縁を結んだ会員",
        pricingModel: "FREE",
        isPublic: true,
        sortOrder: 0,
        stages: [],
      },
    ],
  },
  {
    key: "custom",
    label: "カスタム",
    description: "ゼロから自由に設計する（テンプレートなし）",
    emoji: "✏️",
    useCases: ["独自の会員制度がある", "既存の仕組みを移行したい"],
    membershipTypes: [],
  },
];

export function getTemplate(key: string): SetupTemplate | undefined {
  return SETUP_TEMPLATES.find((t) => t.key === key);
}
