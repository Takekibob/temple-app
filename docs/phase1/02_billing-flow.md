# 設計書 02｜課金フロー（お寺向けサブスクリプション）

## 背景・課題

- 現在の Stripe 連携は「お布施・イベント参加費」の決済のみ
- **てらログ自体の利用料（月額サブスクリプション）** を徴収する仕組みがない
- 新しいお寺が申し込んでも無期限無料で使える状態

---

## 要件

### プラン設計

| プラン | 月額 | 檀家数上限 | トライアル |
|---|---|---|---|
| **スタンダード** | ¥9,800/月 | 500件 | 30日間無料 |
| **プレミアム**（将来） | ¥19,800/月 | 無制限 | 30日間無料 |

> 金額はオーナー確認待ち。ここでは ¥9,800 で設計。

### フロー概要

```
新規お寺が申し込む
    │
    ▼
① セットアップ（/api/setup）
    │ → Temple レコード作成
    │ → trialEndsAt = 今日 + 30日
    │ → planStatus = "TRIAL"
    ▼
② 30日間トライアル使用
    │
    ├─ トライアル終了7日前 → メール通知（未実装・後回し）
    │
    ▼
③ /admin/billing でプラン契約
    │ → Stripe Checkout Session 作成（subscription モード）
    │ → Stripe で決済完了
    │
    ▼
④ Stripe Webhook 受信
    │ → planStatus = "ACTIVE"
    │ → stripeSubscriptionId を保存
    │
    ▼
⑤ 毎月自動課金（Stripe 管理）
    │
    ├─ 支払い失敗 → planStatus = "PAST_DUE" → 機能制限
    └─ 解約 → planStatus = "CANCELLED" → アクセス制限
```

### アクセス制御

| planStatus | 管理者アクセス | 檀家ログイン |
|---|---|---|
| `TRIAL` | ✅ フル | ✅ フル |
| `ACTIVE` | ✅ フル | ✅ フル |
| `PAST_DUE` | ⚠️ 閲覧のみ（編集不可） | ✅ フル |
| `CANCELLED` | ❌ /admin/billing のみ | ❌ メンテナンス画面 |
| `SUSPENDED` | ❌ /admin/billing のみ | ❌ メンテナンス画面 |

---

## 実装方針

### DB スキーマ変更（Prisma マイグレーション）

```prisma
// Temple モデルに追加
model Temple {
  ...既存フィールド...

  // サブスクリプション管理
  planStatus           PlanStatus @default(TRIAL)
  trialEndsAt          DateTime?
  stripeCustomerId     String?    @unique
  stripeSubscriptionId String?    @unique
}

enum PlanStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
  SUSPENDED

  @@map("plan_status")
}
```

### ファイル構成

```
src/app/
├── (admin)/admin/
│   └── billing/
│       ├── page.tsx           ← サブスクリプション管理ページ
│       └── BillingClient.tsx  ← 契約状況・プラン変更・解約
├── api/
│   ├── billing/
│   │   ├── create-subscription/route.ts  ← Stripe Checkout Session 作成
│   │   ├── portal/route.ts              ← Stripe Customer Portal URL 発行
│   │   └── status/route.ts             ← 現在の契約状況取得
│   └── webhooks/
│       └── stripe-billing/route.ts     ← サブスク Webhook 処理
└── middleware.ts              ← planStatus チェックを追加
```

### middleware の変更

```typescript
// 現状: 認証チェックのみ
// 変更後: CANCELLED/SUSPENDED の場合は /admin/billing にリダイレクト

if (isAdminPath && planStatus === 'CANCELLED') {
  if (!pathname.startsWith('/admin/billing')) {
    return NextResponse.redirect('/admin/billing');
  }
}
```

### Stripe Webhook イベント

| イベント | 処理 |
|---|---|
| `customer.subscription.created` | `planStatus = ACTIVE` |
| `customer.subscription.updated` | ステータス同期 |
| `customer.subscription.deleted` | `planStatus = CANCELLED` |
| `invoice.payment_failed` | `planStatus = PAST_DUE` |
| `invoice.payment_succeeded` | `planStatus = ACTIVE`（復旧） |

---

## UI イメージ

### `/admin/billing`

```
┌────────────────────────────────────────┐
│  💳 プラン・お支払い                    │
├────────────────────────────────────────┤
│  現在のプラン                           │
│  ┌──────────────────────────────────┐  │
│  │  🟢 トライアル中                  │  │
│  │  残り 23日（2026年4月28日まで）   │  │
│  │                                  │  │
│  │  [プランを契約する →]             │  │
│  └──────────────────────────────────┘  │
│                                        │
│  スタンダードプラン                     │
│  ¥9,800 / 月（税込）                   │
│  ・檀家管理（500件まで）               │
│  ・イベント・法要管理                   │
│  ・LINE連携                            │
│  ・メール・プッシュ通知                 │
│                                        │
│  [Stripeで契約する]                     │
└────────────────────────────────────────┘

── 契約済みの場合 ──

┌────────────────────────────────────────┐
│  現在のプラン                           │
│  ┌──────────────────────────────────┐  │
│  │  ✅ スタンダードプラン            │  │
│  │  次回更新日：2026年5月1日         │  │
│  │  ¥9,800/月                       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [支払い情報・領収書を確認]             │
│  [プランを解約する]                     │
└────────────────────────────────────────┘
```

---

## 変更対象ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `prisma/schema.prisma` | 修正（Temple に planStatus 等追加） |
| `prisma/migrations/` | 新規マイグレーション |
| `src/app/(admin)/admin/billing/page.tsx` | 新規作成 |
| `src/app/(admin)/admin/billing/BillingClient.tsx` | 新規作成 |
| `src/app/api/billing/create-subscription/route.ts` | 新規作成 |
| `src/app/api/billing/portal/route.ts` | 新規作成 |
| `src/app/api/billing/status/route.ts` | 新規作成 |
| `src/app/api/webhooks/stripe-billing/route.ts` | 新規作成 |
| `src/app/api/setup/route.ts` | 修正（trialEndsAt 設定） |
| `src/middleware.ts` | 修正（planStatus アクセス制御） |
| `src/app/(admin)/admin/layout.tsx` | 修正（Billing サイドバーリンク追加） |

---

## 確認事項

- [ ] 月額料金（¥9,800 で良いか）
- [ ] トライアル期間（30日で良いか）
- [ ] Stripe アカウントの本番モード切り替え済みか
- [ ] `PAST_DUE` 時の機能制限の範囲（どの機能を制限するか）
- [ ] 年払いプランを設けるか
