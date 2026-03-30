# てらログ v2.0 差分設計書
既存実装ベースのフィードバック反映計画

**作成日:** 2026年3月30日
**ベース仕様:** てらログ システム仕様書（2026-03-30版、work/haradaブランチ）
**目的:** 経営者フィードバック10項目を既存コードベースに段階的に反映する

---

## はじめに：既存実装との整合性

本書は既存のてらログ仕様書（Prisma + Next.js 16 App Router + Supabase Auth）を
**正（Single Source of Truth）** とし、フィードバック10項目を差分として定義する。

既に実装済みの機能（重複しない）:

- ✅ MemberType（DANKA/GOEN）によるアクセス制御
- ✅ MemberStage（GOEN → PROSPECT → DANKA_CANDIDATE → DANKA）のCRMパイプライン
- ✅ エンゲージメントスコア（減衰式計算・ScoringRule・ScoringEvent）
- ✅ ステージ自動遷移（lifetimeScoreベース）+ StageTransition記録
- ✅ 操作ログ（ActivityLog）
- ✅ LINE連携（6桁コード紐付け・リマインダー通知）
- ✅ Stripe決済（サブスク + イベント都度払い + 返金）
- ✅ Web Push + LINE + メール通知
- ✅ CRMパイプライン画面（/admin/pipeline）
- ✅ 転換管理画面（/admin/conversion）
- ✅ スコアリングルール設定（/admin/settings/scoring）
- ✅ CSVインポート・エクスポート
- ✅ SUPER_ADMIN管理画面

本書で追加・拡張する範囲のみ記述する。

---

## 第1部：フィードバック10項目 → 実装マッピング

| # | フィードバック | 既存実装状況 | 本書の対応 |
|---|---|---|---|
| ① | 収益機能強化 | △ Stripeイベント決済あり。サブスク会員・寄付・ECはなし | 新規実装 |
| ② | ご縁→檀家化 | ◎ スコアリング・ステージ・パイプライン実装済み | 拡張（自動ステップ配信連動） |
| ③ | LINE連携主軸化 | △ 基本連携あり。自動配信・LIFF・セグメント配信なし | 大幅拡張 |
| ④ | 紙→デジタル移行 | △ CSVインポートあり。OCR・写真取り込みなし | 新規実装 |
| ⑤ | 高齢ユーザー対策 | × 未実装 | 新規実装 |
| ⑥ | 寺院ブランディング | × 未実装（Temple基本情報のみ） | 新規実装 |
| ⑦ | データ分析 | △ ダッシュボードグラフ・イベント分析あり。離脱予測等なし | 拡張 |
| ⑧ | マルチ寺院PF | △ 基本対応済み（お気に入り・全寺院一覧）。レコメンドなし | 拡張 |
| ⑨ | セキュリティ強化 | ◎ ActivityLog・RLS・MFA・レート制限実装済み | 小規模拡張 |
| ⑩ | 導入支援パッケージ | × 未実装（サービス設計のみ） | 新規実装 |

---

## 第2部：Prismaスキーマ差分

以下はすべて `prisma/schema.prisma` への追加・変更。
既存モデルへのフィールド追加は `// --- v2追加 ---` コメントで明示。

### 2.1 既存Enum追加

```prisma
// 既存の ActivityType に追加
enum ActivityType {
  // --- 既存 ---
  LOGIN
  NEWS_VIEW
  EVENT_APPLY
  EVENT_ATTEND
  EVENT_FEEDBACK
  KUYO_APPLY
  CONTACT
  CONSECUTIVE_MONTH
  // --- v2追加 ---
  DONATION           // 寄付
  DONATION_LARGE     // 高額寄付（10,000円以上）
  SUBSCRIPTION_START // サブスク開始
  REFERRAL           // 紹介
  LINE_MESSAGE_OPEN  // LINEメッセージ開封
}

// 新規Enum
enum DisplayMode {
  STANDARD
  SIMPLE
}

enum FontSize {
  MEDIUM
  LARGE
  XLARGE
}

enum DonationPurpose {
  GENERAL       // 一般寄付
  REPAIR        // 修繕
  CEREMONY      // 法要
  CROWDFUNDING  // クラウドファンディング型
  OTHER
}

enum SubscriptionInterval {
  MONTHLY
  YEARLY
  ONE_TIME
}

enum MemberSubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  PAUSED
}

enum LineMessageType {
  BROADCAST     // 一斉配信
  SEGMENT       // セグメント配信
  INDIVIDUAL    // 個別配信
  STEP          // 自動ステップ配信
  REMINDER      // リマインダー
  THANKYOU      // お礼自動送信
}

enum LineMessageStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  FAILED
}

enum LineStepTrigger {
  FIRST_EVENT_ATTEND    // イベント初参加
  LINE_REGISTER         // LINE登録
  STAGE_CHANGE_PROSPECT // PROSPECTに遷移
  STAGE_CHANGE_CANDIDATE // DANKA_CANDIDATEに遷移
  DONATION_FIRST        // 初回寄付
}

enum StepQueueStatus {
  PENDING
  COMPLETED
  CANCELLED
}

enum OcrRequestStatus {
  SUBMITTED
  PROCESSING
  REVIEW
  COMPLETED
  FAILED
}

enum OcrRequestType {
  KAKOCHO   // 過去帳
  MEIBO     // 檀家名簿
  OTHER
}

enum OnboardingPackStatus {
  REQUESTED
  IN_PROGRESS
  DATA_ENTRY
  LINE_SETUP
  TRAINING
  SUPPORT_PERIOD
  COMPLETED
}

enum TemplePageTemplate {
  CLASSIC
  MODERN
  ZEN
  NATURE
}
```

### 2.2 既存モデルへのフィールド追加

#### Temple（寺院）

```prisma
model Temple {
  // --- 既存フィールドすべて維持 ---

  // --- v2追加：収益・LINE拡張 ---
  stripeAccountId       String?           // Stripe Connectアカウント（寺院別決済用）
  dankaGoalAnnual       Int?              // 年間檀家増加目標

  // --- v2追加：ステージ閾値カスタマイズ ---
  thresholdGoen         Int     @default(10)   // → PROSPECT遷移スコア
  thresholdProspect     Int     @default(50)   // → DANKA_CANDIDATE遷移スコア
  thresholdCandidate    Int     @default(80)   // 住職通知スコア

  // --- v2追加：リレーション ---
  membershipPlans       MembershipPlan[]
  donations             Donation[]
  lineStepSequences     LineStepSequence[]
  ocrRequests           OcrRequest[]
  onboardingPacks       OnboardingPack[]
  templePage            TemplePage?
  analyticsSnapshots    AnalyticsSnapshot[]
  lineMessages          LineMessage[]
}
```

#### Member（会員）

```prisma
model Member {
  // --- 既存フィールドすべて維持 ---
  // engagementScore, lifetimeScore, stage, type 等は既存のまま

  // --- v2追加：代理アカウント（高齢者対策） ---
  proxyUserId     String?            // 家族代理アカウント
  proxyRelation   String?            // 'child', 'grandchild', 'spouse', 'other'
  proxyUser       User?     @relation("ProxyMembers", fields: [proxyUserId], references: [id])

  // --- v2追加：流入経路詳細 ---
  sourceDetail    String?            // 流入経路の補足（紹介者名等）

  // --- v2追加：リレーション ---
  subscriptions   MemberSubscription[]
  donations       Donation[]
  lineStepQueues  LineStepQueue[]
}
```

#### User（ユーザー）

```prisma
model User {
  // --- 既存フィールドすべて維持 ---

  // --- v2追加：表示設定（高齢者対策） ---
  displayMode     DisplayMode  @default(STANDARD)
  fontSize        FontSize     @default(MEDIUM)
  highContrast    Boolean      @default(false)

  // --- v2追加：リレーション ---
  proxyMembers    Member[]     @relation("ProxyMembers")
}
```

### 2.3 新規モデル

#### MembershipPlan（サブスク・会員プラン）— ① 収益機能

```prisma
model MembershipPlan {
  id              String    @id @default(uuid())
  templeId        String
  temple          Temple    @relation(fields: [templeId], references: [id], onDelete: Cascade)

  name            String                    // '年間護持会費', '座禅通い放題パス'
  description     String?
  price           Int                       // 円（税込）
  interval        SubscriptionInterval  @default(MONTHLY)
  benefits        Json?                     // ['座禅会無料', '法話配信', '優先予約']
  maxMembers      Int?                      // 定員（NULLは無制限）

  stripePriceId   String?
  stripeProductId String?

  isActive        Boolean   @default(true)
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  subscriptions   MemberSubscription[]
}
```

#### MemberSubscription（会員登録）— ① 収益機能

```prisma
model MemberSubscription {
  id                    String    @id @default(uuid())
  memberId              String
  member                Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  planId                String
  plan                  MembershipPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  templeId              String

  stripeSubscriptionId  String?
  stripeCustomerId      String?

  status                MemberSubscriptionStatus @default(ACTIVE)
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  canceledAt            DateTime?
  cancelReason          String?

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([memberId, status])
  @@index([templeId, status])
}
```

#### Donation（寄付）— ① 収益機能

```prisma
model Donation {
  id              String    @id @default(uuid())
  templeId        String
  temple          Temple    @relation(fields: [templeId], references: [id], onDelete: Cascade)
  memberId        String?
  member          Member?   @relation(fields: [memberId], references: [id], onDelete: SetNull)

  amount          Int                       // 円
  purpose         DonationPurpose @default(GENERAL)
  purposeDetail   String?                   // 自由記述（'本堂修繕', '○○法要' 等）

  // 既存の PaymentMethod enum を流用
  paymentMethod   PaymentMethod

  stripePaymentIntentId String?

  // 匿名寄付対応
  donorName       String?
  donorEmail      String?

  thankyouSent    Boolean   @default(false)
  thankyouSentAt  DateTime?

  notes           String?
  donatedAt       DateTime  @default(now())
  createdAt       DateTime  @default(now())

  @@index([templeId, donatedAt(sort: Desc)])
}
```

#### LineMessage（LINE配信履歴）— ③ LINE拡張

```prisma
model LineMessage {
  id              String    @id @default(uuid())
  templeId        String
  temple          Temple    @relation(fields: [templeId], references: [id], onDelete: Cascade)

  messageType     LineMessageType
  targetStage     MemberStage?              // セグメント配信時の対象ステージ
  targetMemberIds String[]                  // 個別配信時の対象

  content         Json                      // LINE Messaging API形式

  sentCount       Int       @default(0)
  deliveredCount  Int       @default(0)
  openedCount     Int       @default(0)

  scheduledAt     DateTime?
  sentAt          DateTime?
  status          LineMessageStatus @default(DRAFT)

  createdBy       String?
  createdAt       DateTime  @default(now())
}
```

#### LineStepSequence（自動ステップ配信）— ③ LINE拡張

```prisma
model LineStepSequence {
  id              String    @id @default(uuid())
  templeId        String
  temple          Temple    @relation(fields: [templeId], references: [id], onDelete: Cascade)

  name            String                    // 'ご縁さん育成シーケンス'
  trigger         LineStepTrigger

  steps           Json                      // 配信ステップ配列
  // [
  //   { delayDays: 0, message: { type: 'text', text: '...' } },
  //   { delayDays: 3, message: { type: 'text', text: '...' } },
  //   { delayDays: 14, message: { type: 'flex', altText: '...', contents: {...} } }
  // ]

  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  queues          LineStepQueue[]
}
```

#### LineStepQueue（ステップ配信実行管理）— ③ LINE拡張

```prisma
model LineStepQueue {
  id              String    @id @default(uuid())
  sequenceId      String
  sequence        LineStepSequence @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  memberId        String
  member          Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  templeId        String

  currentStep     Int       @default(0)      // steps配列のインデックス
  nextSendAt      DateTime
  status          StepQueueStatus @default(PENDING)

  startedAt       DateTime  @default(now())
  completedAt     DateTime?

  @@index([nextSendAt, status])
}
```

#### OcrRequest（紙データ取り込み）— ④ 紙→デジタル

```prisma
model OcrRequest {
  id              String    @id @default(uuid())
  templeId        String
  temple          Temple    @relation(fields: [templeId], references: [id], onDelete: Cascade)

  requestType     OcrRequestType
  fileUrls        String[]                  // Supabase Storageパス
  status          OcrRequestStatus @default(SUBMITTED)
  extractedData   Json?                     // OCR結果
  importedCount   Int       @default(0)

  notes           String?
  submittedBy     String?                   // User.id
  processedBy     String?                   // 代行処理者

  submittedAt     DateTime  @default(now())
  completedAt     DateTime?
}
```

#### OnboardingPack（導入おまかせパック）— ⑩ 導入支援

```prisma
model OnboardingPack {
  id              String    @id @default(uuid())
  templeId        String
  temple          Temple    @relation(fields: [templeId], references: [id], onDelete: Cascade)

  status          OnboardingPackStatus @default(REQUESTED)

  // 進捗管理
  hearingDone     Boolean   @default(false)
  hearingDate     DateTime?
  hearingNotes    String?

  dataEntryDone   Boolean   @default(false)
  dataEntryCount  Int       @default(0)       // 取り込み件数

  lineSetupDone   Boolean   @default(false)
  trainingDone    Boolean   @default(false)
  trainingDate    DateTime?

  supportEndsAt   DateTime?                   // 30日サポート終了日

  // Stripe決済
  stripePaymentIntentId String?
  paidAmount      Int?                        // 円
  paidAt          DateTime?

  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### TemplePage（寺院公開LP）— ⑥ ブランディング

```prisma
model TemplePage {
  id              String    @id @default(uuid())
  templeId        String    @unique
  temple          Temple    @relation(fields: [templeId], references: [id], onDelete: Cascade)

  slug            String    @unique           // URL: /temples/p/{slug}
  template        TemplePageTemplate @default(CLASSIC)

  heroImageUrl    String?
  galleryImageUrls String[]
  customSections  Json      @default("[]")    // セクション定義配列

  seoTitle        String?
  seoDescription  String?

  isPublished     Boolean   @default(false)
  publishedAt     DateTime?
  updatedAt       DateTime  @updatedAt
}
```

#### AnalyticsSnapshot（分析スナップショット）— ⑦ データ分析

```prisma
model AnalyticsSnapshot {
  id              String    @id @default(uuid())
  templeId        String
  temple          Temple    @relation(fields: [templeId], references: [id], onDelete: Cascade)

  snapshotDate    DateTime  @db.Date
  periodType      String                    // 'daily', 'weekly', 'monthly'

  metrics         Json
  // {
  //   totalMembers, stageCounts, newMembers, churnedMembers,
  //   netGrowth, totalRevenue, eventAttendance,
  //   avgEngagementScore, lineFollowers, conversionRate
  // }

  @@unique([templeId, snapshotDate, periodType])
  @@index([templeId, snapshotDate(sort: Desc)])
}
```

---

## 第3部：API差分（新規エンドポイントのみ）

既存APIはすべて維持。以下は新規追加分。

### 3.1 収益機能（①）

| Method | Path | 説明 | 権限 | Phase |
|---|---|---|---|---|
| GET | /api/plans | 会員プラン一覧 | ADMIN/STAFF | 3 |
| POST | /api/plans | プラン作成 | ADMIN | 3 |
| PATCH | /api/plans/[id] | プラン更新 | ADMIN | 3 |
| DELETE | /api/plans/[id] | プラン無効化 | ADMIN | 3 |
| POST | /api/subscriptions | サブスク開始（Stripe連携） | MEMBER | 3 |
| PATCH | /api/subscriptions/[id] | サブスク変更 | MEMBER | 3 |
| POST | /api/subscriptions/[id]/cancel | サブスク解約 | MEMBER/ADMIN | 3 |
| GET | /api/donations | 寄付一覧 | ADMIN/STAFF | 3 |
| POST | /api/donations | 寄付記録（現金・振込） | ADMIN/STAFF | 3 |
| POST | /api/donations/checkout | オンライン寄付Stripeリンク生成 | 公開 | 3 |
| POST | /api/donations/[id]/thankyou | お礼メール送信 | ADMIN/STAFF | 3 |

**実装ポイント:**
- Stripe Checkout Session作成時に `metadata.donationId` を付与
- 既存の `/api/webhooks/stripe` に donation 処理を追加
- 寄付時に既存の `recordScoringEvent()` でスコア付与（DONATION / DONATION_LARGE）
- 既存の `logActivity()` で操作ログ記録

### 3.2 LINE拡張（③）

| Method | Path | 説明 | 権限 | Phase |
|---|---|---|---|---|
| GET | /api/line/messages | 配信履歴一覧 | ADMIN/STAFF | 3 |
| POST | /api/line/messages/send | メッセージ送信（一斉/セグメント/個別） | ADMIN | 3 |
| POST | /api/line/messages/schedule | 予約配信 | ADMIN | 3 |
| GET | /api/line/sequences | ステップ配信一覧 | ADMIN | 3 |
| POST | /api/line/sequences | ステップ配信作成 | ADMIN | 3 |
| PATCH | /api/line/sequences/[id] | ステップ配信更新 | ADMIN | 3 |
| DELETE | /api/line/sequences/[id] | ステップ配信無効化 | ADMIN | 3 |

**実装ポイント:**
- 既存の `/api/webhooks/line` を拡張（フォローイベント時にステップ配信開始）
- 新規Cronジョブ `/api/cron/line-steps` でキュー処理（15分間隔）
- セグメント配信は `Member.stage` でフィルタ（既存のMemberStage enum利用）
- 既存の `LINE_CHANNEL_ACCESS_TOKEN` 環境変数を使用

### 3.3 紙→デジタル移行（④）

| Method | Path | 説明 | 権限 | Phase |
|---|---|---|---|---|
| POST | /api/ocr/upload | 画像アップロード → Supabase Storage | ADMIN | 3 |
| POST | /api/ocr/process | OCR実行（Google Cloud Vision） | ADMIN | 3 |
| GET | /api/ocr/[id] | OCR結果取得 | ADMIN | 3 |
| POST | /api/ocr/[id]/import | OCR結果→Member一括登録 | ADMIN | 3 |

**実装ポイント:**
- 既存の Supabase Storage（teralog-assets バケット）を利用
- OCR処理は Google Cloud Vision API（新規環境変数: `GOOGLE_CLOUD_VISION_API_KEY`）
- 結果確認→修正→インポートの3ステップUI
- インポート時は既存の `/api/members` POST相当のバリデーション適用

### 3.4 高齢ユーザー対策（⑤）

| Method | Path | 説明 | 権限 | Phase |
|---|---|---|---|---|
| PATCH | /api/me/preferences | 表示設定変更 | 認証済み | 2 |
| POST | /api/members/[id]/proxy | 家族代理アカウント設定 | ADMIN | 2 |
| DELETE | /api/members/[id]/proxy | 家族代理アカウント解除 | ADMIN | 2 |

**実装ポイント:**
- `User.displayMode` / `User.fontSize` / `User.highContrast` で制御
- シンプルモード用レイアウト: 既存の `app/(member)/layout.tsx` に条件分岐追加
- `proxy.ts` で代理アカウントのセッション管理（代理ユーザーは対象メンバーのデータにアクセス可）

### 3.5 寺院ブランディング（⑥）

| Method | Path | 説明 | 権限 | Phase |
|---|---|---|---|---|
| GET | /api/temple-page | 自寺院LP取得 | ADMIN | 4 |
| PUT | /api/temple-page | LP作成・更新 | ADMIN | 4 |
| POST | /api/temple-page/publish | LP公開 | ADMIN | 4 |
| POST | /api/temple-page/images | ギャラリー画像アップロード | ADMIN | 4 |

**実装ポイント:**
- 公開ページ: `/temples/p/[slug]` （既存の `/api/temples/[id]` とは別ルート）
- 既存の `Temple.description`, `coverImageUrl` を初期値として利用
- テンプレートはTailwind CSSで4種類実装

### 3.6 データ分析拡張（⑦）

| Method | Path | 説明 | 権限 | Phase |
|---|---|---|---|---|
| GET | /api/analytics/retention | 離脱予測・維持率分析 | ADMIN | 4 |
| GET | /api/analytics/events/roi | イベントROI | ADMIN/STAFF | 4 |
| GET | /api/analytics/pipeline/trend | パイプライン推移（時系列） | ADMIN | 4 |
| GET | /api/analytics/revenue/forecast | 収益予測 | ADMIN | 4 |
| POST | /api/analytics/reports/pdf | 月次レポートPDF生成 | ADMIN | 4 |

**実装ポイント:**
- 既存の `@react-pdf/renderer` で月次レポートPDF生成
- `AnalyticsSnapshot` テーブルに日次データをCronで蓄積
- 既存の `recharts` でグラフ表示
- 新規Cronジョブ `/api/cron/analytics-snapshot` で日次スナップショット作成

### 3.7 導入支援（⑩）

| Method | Path | 説明 | 権限 | Phase |
|---|---|---|---|---|
| POST | /api/onboarding-pack | パック申込 | ADMIN | 3 |
| GET | /api/onboarding-pack/[id] | 進捗確認 | ADMIN | 3 |
| PATCH | /api/onboarding-pack/[id] | ステータス更新 | SUPER_ADMIN | 3 |

### 3.8 セキュリティ拡張（⑨）

| Method | Path | 説明 | 権限 | Phase |
|---|---|---|---|---|
| POST | /api/export/all | 全データエクスポート（バックアップ用） | ADMIN | 2 |

**実装ポイント:**
- 既存の `ActivityLog` に記録対象を拡大（reservation, ofuse, donation, announcement への CRUD）
- 既存の `logActivity()` を全APIルートに適用
- データ保持ポリシーの明文化（設定画面に表示）

---

## 第4部：画面差分（App Router追加ページ）

既存の画面構成を維持し、以下を追加。

### 4.1 管理者ページ追加

```
app/(admin)/admin/
├── revenue/
│   ├── page.tsx              // 収益ダッシュボード（寄付+サブスク+イベント収益の統合）
│   ├── plans/page.tsx        // 会員プラン管理
│   ├── donations/page.tsx    // 寄付管理
│   └── subscriptions/page.tsx // サブスク管理
│
├── line/
│   ├── page.tsx              // LINE配信ダッシュボード
│   ├── messages/
│   │   ├── page.tsx          // 配信履歴
│   │   └── new/page.tsx      // 配信作成
│   └── sequences/
│       ├── page.tsx          // ステップ配信一覧
│       └── new/page.tsx      // ステップ配信作成
│
├── ocr/
│   ├── page.tsx              // OCR取り込み一覧
│   └── new/page.tsx          // 新規取り込み（写真アップロード→確認→インポート）
│
├── temple-page/
│   └── page.tsx              // 寺院LP編集
│
├── analytics/
│   ├── page.tsx              // 経営分析ダッシュボード（拡張）
│   ├── retention/page.tsx    // 離脱予測
│   └── reports/page.tsx      // レポート出力
│
└── onboarding-pack/
    └── page.tsx              // 導入おまかせパック管理
```

### 4.2 会員ページ追加

```
app/(member)/app/
├── donations/
│   ├── page.tsx              // 寄付履歴
│   └── new/page.tsx          // オンライン寄付フォーム
│
└── subscriptions/
    └── page.tsx              // 会員プラン管理
```

### 4.3 公開ページ追加

```
app/(public)/
├── temples/p/[slug]/page.tsx  // 寺院公開LP
└── donate/[templeId]/page.tsx // 公開寄付ページ
```

### 4.4 シンプルモード対応

既存の `app/(member)/layout.tsx` に以下のロジックを追加:

```typescript
// User.displayMode に基づいてレイアウトを切り替え
const user = await getAuthUser()
if (user?.displayMode === 'SIMPLE') {
  return <SimpleLayout>{children}</SimpleLayout>
}
return <StandardLayout>{children}</StandardLayout>
```

**SimpleLayout の要件:**
- ナビゲーション: ボタン3つのみ（法要予約 / お知らせ / お問い合わせ）
- フォントサイズ: `User.fontSize` に基づき base を 18px / 22px / 26px に切替
- ボタン: 最小 48×48px、角丸大きめ（16px）
- 色: `User.highContrast` が true の場合、コントラスト比 7:1以上を保証
- ページ遷移: 戻るボタンを常に表示

---

## 第5部：Cronジョブ差分

既存のCronジョブ3本に加えて以下を追加。

| パス | 実行タイミング | 内容 | Phase |
|---|---|---|---|
| /api/cron/line-steps | 毎15分 | LineStepQueueの `pending` 処理。`nextSendAt ≤ now()` のキューを取得しLINE送信 | 3 |
| /api/cron/analytics-snapshot | 毎日 03:00 JST | 全寺院のAnalyticsSnapshot日次データ作成 | 4 |
| /api/cron/subscription-check | 毎日 09:00 JST | Stripeサブスク状態の同期確認（MemberSubscriptionの整合性チェック） | 3 |
| /api/cron/inactive-check | 毎日 03:00 JST | 90日以上未活動のメンバーにinactiveフラグ通知（既存engagementと統合検討） | 4 |

---

## 第6部：環境変数差分

既存の環境変数に加えて以下が必要。

| 変数名 | 用途 | Phase | 必須 |
|---|---|---|---|
| GOOGLE_CLOUD_VISION_API_KEY | OCR処理 | 3 | ④使用時 |
| STRIPE_CONNECT_SECRET | Stripe Connect（寺院別決済） | 3 | ①使用時 |
| LIFF_ID | LINE LIFF（ミニアプリ） | 3 | ③使用時 |

---

## 第7部：Phase別実装チェックリスト

### Phase 1（学院1年目）— 設計・最小実装

- [ ] ActivityLog記録対象を全APIに拡大（reservation, ofuse, announcement）
- [ ] 高齢者向けUI設計書・ワイヤーフレーム作成
- [ ] セキュリティドキュメント整備（LP・営業資料用）
- [ ] ヒアリングテンプレート作成・実施（10軒目標）
- [ ] データエクスポート（全テーブル一括）機能追加
- [ ] 既存スコアリングのデフォルトルールにDONATION等を追加

### Phase 2（学院2年目）— コア拡張

- [ ] Prismaスキーマ更新（User: displayMode/fontSize/highContrast追加）
- [ ] `User.displayMode` / `fontSize` / `highContrast` のAPIエンドポイント実装
- [ ] シンプルモードUI実装（SimpleLayout コンポーネント）
- [ ] 家族代理アカウント機能（Member.proxyUserId）実装
- [ ] `Temple.thresholdGoen/Prospect/Candidate` のカスタマイズUI
- [ ] 既存 `/admin/pipeline` のUI改善（ステージ閾値カスタマイズ反映）
- [ ] βテスト寺院5軒でテスト実施

### Phase 3（卒業後1年目）— 本格リリース

- [ ] Prismaスキーマ更新（MembershipPlan, MemberSubscription, Donation, LineMessage, LineStepSequence, LineStepQueue, OcrRequest, OnboardingPack）
- [ ] 収益機能API実装（plans, subscriptions, donations）
- [ ] Stripe Connect連携（寺院別決済）
- [ ] LINE拡張API実装（messages, sequences）
- [ ] Cronジョブ追加（line-steps, subscription-check）
- [ ] OCR取り込みAPI + UI実装
- [ ] 導入おまかせパックAPI + 管理UI
- [ ] 収益ダッシュボード実装（/admin/revenue）
- [ ] LINE配信管理画面実装（/admin/line）
- [ ] 公開寄付ページ実装（/donate/[templeId]）
- [ ] 有料プラン正式リリース（料金表更新）

### Phase 4（卒業後2-3年目）— スケール

- [ ] Prismaスキーマ更新（TemplePage, AnalyticsSnapshot）
- [ ] 寺院LP生成機能（/admin/temple-page + /temples/p/[slug]）
- [ ] 離脱予測分析（engagementScore推移の回帰分析）
- [ ] イベントROI分析（既存EventParticipation + Ofuseデータを集計）
- [ ] 月次レポートPDF自動生成（既存@react-pdf/renderer拡張）
- [ ] AnalyticsSnapshot日次Cron実装
- [ ] マルチ寺院レコメンド機能（既存MemberFavoriteTempleベースで協調フィルタリング）
- [ ] 合同イベント機能（既存Eventモデルを拡張）

---

## 第8部：ポジショニング変更（コード以外）

コードに直接影響しないが、事業成功に必須の変更。

### 8.1 コピー変更

| 対象 | Before | After |
|---|---|---|
| LPメインコピー | お寺の日常業務をデジタル化 | ご縁を檀家に変える、お寺の経営OS |
| 機能説明 | 檀家管理・法要予約・イベント管理 | 管理・集客・収益・育成の4つが回る |
| 差別化メッセージ | 業務効率化ツール | 檀家を増やせる唯一のシステム |

### 8.2 料金体系変更

| 項目 | 現行 | 変更後 |
|---|---|---|
| 無料プラン | なし（30日トライアルのみ） | はじめてプラン（永久無料・100件制限）追加 |
| スタンダード | ¥9,800/月 | ¥9,800/月（変更なし）→ 名称を「ご縁プラン」に |
| プレミアム | 未定 | ¥19,800/月「経営OSプラン」として定義 |
| 導入おまかせパック | なし | ¥49,800〜（初回のみ） |

**Prisma変更:** 既存の `PlanStatus` enum に `FREE` を追加

```prisma
enum PlanStatus {
  FREE        // v2追加
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
  SUSPENDED
}
```

---

> 本差分設計書は既存実装の仕様書と併読すること。
> 実装時は既存仕様書の「実装を正とする」原則に従い、
> 本書の内容と既存コードに差分がある場合は既存コードを優先する。
> 各Phaseの詳細実装はClaude Codeで本書と既存仕様書を両方参照しながら進めること。
