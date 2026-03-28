# てらログ — システム仕様書

> **Single Source of Truth: このドキュメントはコードベースを解析して生成されています。**
> 設計書v4との差分がある場合は**実装を正**とします。

**作成日:** 2026-03-28
**最終更新:** 2026-03-28（マルチテンプル対応・イベント横断表示を追加）
**コードベースバージョン:** `work/harada` ブランチ

---

## 目次

1. [システム概要](#1-システム概要)
2. [ディレクトリ構成](#2-ディレクトリ構成)
3. [データベース設計](#3-データベース設計)
4. [認証・認可](#4-認証認可)
5. [画面一覧・ルーティング](#5-画面一覧ルーティング)
6. [API一覧](#6-api一覧)
7. [主要機能の仕様](#7-主要機能の仕様)
8. [コンポーネント設計](#8-コンポーネント設計)
9. [外部サービス連携](#9-外部サービス連携)
10. [セキュリティ](#10-セキュリティ)
11. [未実装機能・既知の課題](#11-未実装機能既知の課題)
12. [デプロイ・運用](#12-デプロイ運用)

---

## 1. システム概要

### 1.1 アプリ名・概要

**てらログ（teralog）**

お寺の日常業務をデジタル化するDX管理アプリ。法要予約・過去帳・会員管理・お布施会計・イベント運営を一元管理する。会員を**檀家（DANKA）**と**ご縁さん（GOEN）**に分類し、SBNRと呼ばれる宗教に属さないが精神性を求める層の取り込みを想定した設計になっている。

**マルチテンプル対応（2026-03-28追加）:** 複数寺院が同一プラットフォームに登録でき、ご縁さんは全寺院の公開イベントを横断的に閲覧・参加申込できる。檀家は自寺院イベント（公開＋檀家限定）を優先表示し、他寺院の公開イベントも参照可能。

### 1.2 技術スタック

#### フレームワーク・ランタイム

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `next` | 16.2.1 | App Router、Server Actions、API Routes、PWA |
| `react` | 19.2.4 | UIレンダリング |
| `react-dom` | 19.2.4 | DOMレンダリング |
| `typescript` | ^5 | 静的型付け |

#### データベース・ORM

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `prisma` | ^7.5.0 | ORM |
| `@prisma/client` | ^7.5.0 | 型安全クライアント |
| `@prisma/adapter-pg` | ^7.5.0 | Serverless用PostgreSQLアダプター |
| `pg` | ^8.20.0 | PostgreSQLドライバー |

#### 認証・バックエンドサービス

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `@supabase/supabase-js` | ^2.99.3 | Supabase JSクライアント |
| `@supabase/ssr` | ^0.9.0 | SSR用Supabase（Cookie管理） |

#### 決済

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `stripe` | ^20.4.1 | オンライン決済（イベント参加費） |

#### 通知

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `web-push` | ^3.6.7 | Web Push通知（VAPID） |
| `@line/bot-sdk` | ^10.6.0 | LINE Messaging API |

#### UI・スタイリング

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `tailwindcss` | ^4 | ユーティリティCSS |
| `shadcn` | ^4.1.0 | UIコンポーネント基盤 |
| `@base-ui/react` | ^1.3.0 | アクセシブルUIプリミティブ |
| `lucide-react` | ^0.577.0 | アイコン |
| `recharts` | ^3.8.1 | グラフ・チャート |
| `clsx` | ^2.1.1 | クラス名結合ユーティリティ |
| `tailwind-merge` | ^3.5.0 | Tailwindクラスのマージ |
| `class-variance-authority` | ^0.7.1 | バリアントスタイル管理 |
| `tw-animate-css` | ^1.4.0 | アニメーション |

#### データ処理

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `papaparse` | ^5.5.3 | CSVパース（会員インポート） |
| `@types/papaparse` | ^5.5.2 | 型定義 |

#### PWA

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `next-pwa` | ^5.6.0 | Service Worker、オフライン対応 |

#### テスト

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `jest` | ^29.7.0 | 単体テスト |
| `@testing-library/react` | ^16.3.2 | Reactテスト |
| `@testing-library/user-event` | ^14.6.1 | ユーザー操作シミュレーション |
| `@playwright/test` | ^1.58.2 | E2Eテスト |
| `ts-jest` | ^29.4.6 | TypeScript対応Jest |

### 1.3 ホスティング・インフラ

| 要素 | サービス |
|---|---|
| フロントエンド・API | **Vercel**（リージョン: `hnd1` 東京） |
| データベース | **Supabase PostgreSQL** |
| 認証 | **Supabase Auth**（JWT + Cookie） |
| ファイルストレージ | **Supabase Storage** |
| 決済 | **Stripe** |
| プッシュ通知 | **Web Push API**（VAPID） |
| メッセージング | **LINE Messaging API** |

### 1.4 環境変数一覧

| 変数名 | 用途 | 必須/任意 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | **必須** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | **必須** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase管理者キー（サーバーのみ） | **必須** |
| `DATABASE_URL` | PostgreSQL接続文字列 | **必須** |
| `NEXT_PUBLIC_SITE_URL` | 本番サイトURL（OGP・OAuth・メール） | **必須** |
| `CRON_SECRET` | Cronジョブ認証シークレット | **必須** |
| `STRIPE_SECRET_KEY` | Stripeシークレットキー | **必須** |
| `STRIPE_PUBLISHABLE_KEY` | Stripe公開キー | **必須** |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhookシグニチャー | **必須** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID公開鍵 | **必須** |
| `VAPID_PRIVATE_KEY` | Web Push VAPID秘密鍵 | **必須** |
| `VAPID_SUBJECT` | Web Push件名（mailtoアドレス） | **必須** |
| `LINE_CHANNEL_SECRET` | LINE Webhookシグニチャー検証 | **必須** |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot APIアクセストークン | **必須** |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Storageバケット名（デフォルト: `teralog-assets`） | 任意 |
| `NEXT_PUBLIC_APP_URL` | ローカル開発URL | 任意 |
| `JWT_SECRET` | JWTシークレット（将来のカスタム認証用） | 任意 |
| `JWT_EXPIRY` | アクセストークン有効期限（デフォルト: `30m`） | 任意 |
| `JWT_REFRESH_EXPIRY` | リフレッシュトークン有効期限（デフォルト: `7d`） | 任意 |
| `FCM_SERVER_KEY` | Firebase Cloud Messagingキー（将来用） | 任意 |
| `SENDGRID_API_KEY` | SendGrid APIキー（将来用） | 任意 |
| `FROM_EMAIL` | 送信元メールアドレス | 任意 |
| `PILOT_ADMIN_EMAIL` | シードデータ用管理者メール | 任意（開発） |
| `PILOT_DANKA_EMAIL` | シードデータ用檀家メール | 任意（開発） |
| `PILOT_GOEN_EMAIL` | シードデータ用ご縁さんメール | 任意（開発） |
| `SCREENSHOT_BASE_URL` | スクリーンショット取得用URL | 任意（開発） |
| `SCREENSHOT_ADMIN_EMAIL` | スクリーンショット用管理者メール | 任意（開発） |
| `SCREENSHOT_ADMIN_PASS` | スクリーンショット用管理者パスワード | 任意（開発） |

---

## 2. ディレクトリ構成

```
temple-app/
├── prisma/
│   └── schema.prisma          # DB定義（Single Source of Truth）
├── docs/
│   └── SPECIFICATION.md       # 本仕様書
├── public/
│   ├── manifest.json          # PWAマニフェスト
│   └── icons/                 # アプリアイコン
├── src/
│   ├── app/
│   │   ├── (admin)/           # 管理者向けルートグループ
│   │   │   ├── layout.tsx     # 管理画面レイアウト（サイドバー）
│   │   │   └── admin/
│   │   │       ├── page.tsx               # ダッシュボード
│   │   │       ├── analytics/             # /admin/analytics（→ events/analytics へリダイレクト）
│   │   │       ├── announcements/         # お知らせ管理
│   │   │       ├── annual-events/         # 年中行事管理
│   │   │       ├── conversion/            # ご縁さん→檀家 転換管理
│   │   │       ├── deceased/              # 過去帳管理
│   │   │       ├── events/                # イベント管理
│   │   │       │   ├── analytics/         # イベント分析ダッシュボード
│   │   │       │   └── [id]/
│   │   │       │       ├── analytics/     # イベント個別分析
│   │   │       │       ├── edit/
│   │   │       │       └── participants/
│   │   │       ├── gojikai/               # 護持会費管理
│   │   │       ├── members/               # 会員管理
│   │   │       │   ├── import/            # CSVインポート
│   │   │       │   └── [id]/
│   │   │       ├── ofuse/                 # お布施管理
│   │   │       ├── reports/               # 会計レポート
│   │   │       ├── reservations/          # 予約管理
│   │   │       ├── settings/              # 寺院設定
│   │   │       └── staff/                 # スタッフ管理
│   │   ├── (app)/             # 利用者向けルートグループ
│   │   │   ├── layout.tsx     # アプリレイアウト（BottomNav）
│   │   │   └── app/
│   │   │       ├── page.tsx               # ホーム
│   │   │       ├── calendar/              # 行事カレンダー
│   │   │       ├── deceased/              # 過去帳（閲覧）
│   │   │       ├── events/                # イベント
│   │   │       │   ├── my/               # 申込済みイベント
│   │   │       │   └── [id]/
│   │   │       │       ├── apply/         # 参加申込
│   │   │       │       └── feedback/      # フィードバック
│   │   │       ├── mypage/                # マイページ
│   │   │       ├── news/                  # お知らせ
│   │   │       ├── ofuse/                 # お布施履歴（閲覧）
│   │   │       └── reservations/          # 法要予約（檀家のみ）
│   │   ├── api/               # APIルート
│   │   │   ├── activities/
│   │   │   ├── announcements/
│   │   │   ├── annual-events/
│   │   │   ├── calendar/
│   │   │   ├── checkout/
│   │   │   ├── conversion/
│   │   │   ├── cron/
│   │   │   │   ├── engagement/           # エンゲージメントスコア再計算
│   │   │   │   └── reminders/            # リマインダー送信
│   │   │   ├── deceased/
│   │   │   ├── events/
│   │   │   │   └── [id]/
│   │   │   │       ├── analytics/
│   │   │   │       ├── feedback/
│   │   │   │       ├── participate/
│   │   │   │       ├── participants/
│   │   │   │       │   └── [pid]/
│   │   │   │       │       └── refund/
│   │   │   │       └── send-feedback-request/
│   │   │   ├── export/
│   │   │   ├── gojikai/
│   │   │   ├── line/
│   │   │   ├── me/
│   │   │   ├── members/
│   │   │   │   └── [id]/
│   │   │   │       ├── deceased/
│   │   │   │       ├── line-settings/
│   │   │   │       └── promote/
│   │   │   ├── ofuse/
│   │   │   ├── onboarding/
│   │   │   ├── push/
│   │   │   ├── reports/
│   │   │   ├── reservations/
│   │   │   ├── settings/
│   │   │   ├── setup/
│   │   │   ├── staff/
│   │   │   └── webhooks/
│   │   │       ├── line/                 # LINE Webhook
│   │   │       └── stripe/               # Stripe Webhook
│   │   ├── auth/
│   │   │   ├── actions.ts               # Server Actions（ログイン・登録・ログアウト）
│   │   │   ├── accept-invite/           # スタッフ招待受諾
│   │   │   ├── callback/                # OAuth コールバック
│   │   │   ├── login/                   # /auth/login（/ へリダイレクト）
│   │   │   ├── logout/                  # ログアウト処理
│   │   │   ├── onboarding/              # オンボーディング（会員タイプ登録）
│   │   │   ├── pwa-return/              # PWAリターン
│   │   │   ├── register/                # 新規登録
│   │   │   └── set-password/            # パスワード設定
│   │   ├── setup/                       # 初期セットアップ
│   │   ├── maintenance/                 # メンテナンスページ
│   │   ├── layout.tsx                   # ルートレイアウト
│   │   ├── page.tsx                     # ルートページ（ログイン or リダイレクト）
│   │   ├── not-found.tsx                # 404ページ
│   │   └── globals.css
│   ├── components/
│   │   ├── admin/
│   │   │   └── Sidebar.tsx              # 管理画面サイドバー
│   │   ├── shared/
│   │   │   ├── BottomNav.tsx            # モバイル下部ナビ
│   │   │   ├── RoleGuards.tsx           # ロールガードコンポーネント
│   │   │   └── ShareButton.tsx          # SNS共有ボタン
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── skeleton.tsx             # ローディングスケルトン
│   ├── lib/
│   │   ├── activities.ts                # アクティビティ記録
│   │   ├── auth.ts                      # 認証ヘルパー関数
│   │   ├── engagementScore.ts           # エンゲージメントスコア計算
│   │   ├── eventCapacity.ts             # イベント定員・キャンセル待ち
│   │   ├── line.ts                      # LINE Messaging API
│   │   ├── nenki.ts                     # 年忌計算
│   │   ├── prisma.ts                    # Prismaクライアント
│   │   ├── push.ts                      # Web Push通知
│   │   ├── reservationConflict.ts       # 予約時間重複チェック
│   │   ├── stripe.ts                    # Stripeクライアント
│   │   ├── supabase.ts                  # ブラウザ用Supabaseクライアント
│   │   ├── supabase-admin.ts            # 管理者用Supabaseクライアント
│   │   ├── supabase-server.ts           # サーバー用Supabaseクライアント
│   │   └── utils.ts                     # cn()ユーティリティ
│   ├── generated/
│   │   └── prisma/client/               # Prisma生成ファイル（コミット対象外）
│   ├── proxy.ts                         # ルーティングガード（middlewareとして動作）
│   └── sw-custom.js                     # Service Worker（PWA）
├── vercel.json                          # Vercel設定・Cronジョブ
├── next.config.ts                       # Next.js設定
├── package.json
└── tsconfig.json
```

---

## 3. データベース設計

✅ 実装済み

### 3.1 全テーブル一覧

| テーブル名 | モデル名 | 概要 |
|---|---|---|
| `temples` | Temple | 寺院情報・予約設定 |
| `users` | User | 認証アカウント |
| `members` | Member | 会員情報（檀家+ご縁さん統合） |
| `deceased_persons` | DeceasedPerson | 過去帳（故人情報） |
| `reservations` | Reservation | 法要予約 |
| `events` | Event | イベント |
| `event_participations` | EventParticipation | イベント参加申込 |
| `ofuse` | Ofuse | お布施・会計記録 |
| `gojikai_rules` | GojikaiRule | 護持会費ルール |
| `gojikai_payments` | GojikaiPayment | 護持会費支払い記録 |
| `announcements` | Announcement | お知らせ |
| `annual_events` | AnnualEvent | 年中行事 |
| `member_interactions` | MemberInteraction | 対応履歴・CRMメモ |
| `member_activities` | MemberActivity | アクティビティログ |
| `push_subscriptions` | PushSubscription | Webプッシュ通知サブスクリプション |

### 3.2 テーブル定義

#### `temples`（寺院）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| name | String | ✓ | — | 寺院名 |
| denomination | String | — | — | 宗派 |
| address | String | — | — | 住所 |
| phone | String | — | — | 電話番号 |
| email | String | — | — | 連絡先メール |
| logoUrl | String | — | — | ロゴURL |
| description | String | — | — | 寺院紹介文 |
| bookingStartTime | String | ✓ | "09:00" | 予約受付開始時刻 |
| bookingEndTime | String | ✓ | "17:00" | 予約受付終了時刻 |
| bookingDuration | Int | ✓ | 60 | 1予約あたりの時間（分） |
| bookingMaxSlots | Int | ✓ | 1 | 同時予約可能数 |
| bookingAdvanceDays | Int | ✓ | 1 | 最低何日前から予約可能か |
| reminderDayBefore | Boolean | ✓ | true | 前日リマインダー有効 |
| reminderDayBeforeTime | String | ✓ | "18:00" | 前日リマインダー送信時刻 |
| reminderDayOf | Boolean | ✓ | true | 当日リマインダー有効 |
| reminderDayOfTime | String | ✓ | "09:00" | 当日リマインダー送信時刻 |
| reminderMeinichi | Boolean | ✓ | true | 月命日リマインダー有効 |
| customEventCategories | Json | ✓ | [] | カスタムイベントカテゴリ |
| createdAt | DateTime | ✓ | now() | — |
| updatedAt | DateTime | ✓ | @updatedAt | — |

#### `users`（認証アカウント）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK（Supabase Auth UIDと同じ） |
| templeId | String | ✓ | — | FK → temples |
| role | Role | ✓ | MEMBER | 権限ロール |
| name | String | ✓ | — | 氏名 |
| email | String | ✓ | — | メール（一意） |
| phone | String | — | — | 電話番号 |
| passwordHash | String | — | — | パスワードハッシュ（メール認証時） |
| authProvider | AuthProvider | ✓ | EMAIL | 認証プロバイダー |
| pushToken | String | — | — | FCMトークン（将来用） |
| pushEnabled | Boolean | ✓ | true | プッシュ通知有効 |
| isActive | Boolean | ✓ | true | アカウント有効フラグ |
| lastLoginAt | DateTime | — | — | 最終ログイン日時 |
| createdAt | DateTime | ✓ | now() | — |
| updatedAt | DateTime | ✓ | @updatedAt | — |

#### `members`（会員）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| templeId | String | ✓ | — | FK → temples |
| userId | String | ✓ | — | FK → users（一意） |
| type | MemberType | ✓ | GOEN | DANKA または GOEN |
| familyName | String | ✓ | — | 家名・苗字 |
| address | String | — | — | 住所 |
| postalCode | String | — | — | 郵便番号 |
| phone | String | — | — | 電話番号 |
| email | String | — | — | 連絡先メール（任意） |
| joinedDate | DateTime | ✓ | now() | 入会日 |
| interestTags | Json | — | — | 興味タグ（例: `["zazen","yoga"]`） |
| referralSource | ReferralSource | — | — | 流入元 |
| engagementScore | Int | ✓ | 0 | エンゲージメントスコア（0〜100） |
| promotedAt | DateTime | — | — | ご縁さん→檀家昇格日時 |
| notes | String | — | — | 管理者メモ |
| lineUserId | String | — | — | LINE連携後のユーザーID |
| lineNotifyEnabled | Boolean | ✓ | false | LINE通知有効 |
| lineCode | String | — | — | LINE連携用一時コード（6桁） |
| lineCodeExpiresAt | DateTime | — | — | LINE連携コード有効期限 |
| notifyReservation | Boolean | ✓ | true | 予約通知設定 |
| notifyEvent | Boolean | ✓ | true | イベント通知設定 |
| notifyAnniversary | Boolean | ✓ | true | 記念日通知設定 |
| notifyAnnouncement | Boolean | ✓ | true | お知らせ通知設定 |
| createdAt | DateTime | ✓ | now() | — |
| updatedAt | DateTime | ✓ | @updatedAt | — |

#### `deceased_persons`（過去帳・故人）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| memberId | String | ✓ | — | FK → members |
| name | String | ✓ | — | 俗名 |
| kaimyo | String | — | — | 戒名 |
| deathDate | DateTime | — | — | 没年月日 |
| birthDate | DateTime | — | — | 生年月日 |
| age | Int | — | — | 享年 |
| relationship | String | — | — | 故人との続柄 |
| notes | String | — | — | 備考 |
| createdAt | DateTime | ✓ | now() | — |
| updatedAt | DateTime | ✓ | @updatedAt | — |

#### `reservations`（法要予約）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| templeId | String | ✓ | — | FK → temples |
| memberId | String | ✓ | — | FK → members |
| type | ReservationType | ✓ | — | 法要種別 |
| scheduledAt | DateTime | ✓ | — | 予約日時 |
| durationMin | Int | ✓ | 60 | 所要時間（分） |
| deceasedPersonId | String | — | — | FK → deceased_persons |
| status | ReservationStatus | ✓ | PENDING | 予約ステータス |
| notes | String | — | — | 備考・希望事項 |
| createdAt | DateTime | ✓ | now() | — |
| updatedAt | DateTime | ✓ | @updatedAt | — |

#### `events`（イベント）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| templeId | String | ✓ | — | FK → temples |
| title | String | ✓ | — | イベント名 |
| description | String | — | — | 詳細説明 |
| category | EventCategory | ✓ | — | カテゴリ |
| eventDate | DateTime | ✓ | — | 開催日 |
| startTime | String | ✓ | — | 開始時刻（HH:MM） |
| endTime | String | ✓ | — | 終了時刻（HH:MM） |
| location | String | — | — | 会場（本堂・客殿等） |
| capacity | Int | — | — | 定員（NULL=無制限） |
| fee | Int | ✓ | 0 | 参加費（円、0=無料） |
| visibility | EventVisibility | ✓ | PUBLIC | 公開範囲 |
| imageUrl | String | — | — | カバー画像URL |
| shareUrl | String | — | — | SNS共有用短縮URL |
| status | EventStatus | ✓ | DRAFT | ステータス |
| createdAt | DateTime | ✓ | now() | — |
| updatedAt | DateTime | ✓ | @updatedAt | — |

#### `event_participations`（イベント参加申込）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| eventId | String | ✓ | — | FK → events |
| memberId | String | ✓ | — | FK → members |
| numGuests | Int | ✓ | 1 | 参加人数（本人含む） |
| status | ParticipationStatus | ✓ | APPLIED | 参加ステータス |
| paymentStatus | PaymentStatus | ✓ | NOT_REQUIRED | 決済ステータス |
| paymentAmount | Int | ✓ | 0 | 支払い金額（円） |
| stripeSessionId | String | — | — | Stripe Checkout Session ID |
| stripePaymentIntentId | String | — | — | Stripe Payment Intent ID |
| feedbackScore | Int | — | — | アンケート評価（1〜5） |
| feedbackComment | String | — | — | アンケートコメント |
| createdAt | DateTime | ✓ | now() | — |
| updatedAt | DateTime | ✓ | @updatedAt | — |

ユニーク制約: `(eventId, memberId)`

#### `ofuse`（お布施）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| templeId | String | ✓ | — | FK → temples |
| memberId | String | ✓ | — | FK → members |
| reservationId | String | — | — | FK → reservations（任意） |
| type | OfuseType | ✓ | — | 種別 |
| amount | Int | ✓ | — | 金額（円） |
| paidAt | DateTime | ✓ | — | 納入日 |
| paymentMethod | PaymentMethod | ✓ | CASH | 支払い方法 |
| receiptIssued | Boolean | ✓ | false | 領収書発行済み |
| notes | String | — | — | 備考 |
| createdAt | DateTime | ✓ | now() | — |

#### `gojikai_rules`（護持会費ルール）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| templeId | String | ✓ | — | FK → temples |
| amount | Int | ✓ | — | 年会費金額（円） |
| dueMonth | Int | ✓ | 3 | 請求月（1〜12） |
| createdAt | DateTime | ✓ | now() | — |

#### `gojikai_payments`（護持会費支払い）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| memberId | String | ✓ | — | FK → members（檀家のみ） |
| fiscalYear | Int | ✓ | — | 年度 |
| amount | Int | ✓ | — | 金額（円） |
| status | GojikaiStatus | ✓ | UNPAID | 未納/納付/免除 |
| paidAt | DateTime | — | — | 納付日 |
| dueDate | DateTime | — | — | 期日 |
| createdAt | DateTime | ✓ | now() | — |

ユニーク制約: `(memberId, fiscalYear)`

#### `announcements`（お知らせ）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| templeId | String | ✓ | — | FK → temples |
| title | String | ✓ | — | タイトル |
| body | String | ✓ | — | 本文 |
| targetSegment | AnnouncementTarget | ✓ | ALL | 配信対象セグメント |
| publishedAt | DateTime | — | — | 公開日時（NULLは下書き） |
| pushSent | Boolean | ✓ | false | プッシュ通知送信済み |
| createdAt | DateTime | ✓ | now() | — |
| updatedAt | DateTime | ✓ | @updatedAt | — |

#### `annual_events`（年中行事）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| templeId | String | ✓ | — | FK → temples |
| name | String | ✓ | — | 行事名 |
| month | Int | ✓ | — | 月（1〜12） |
| day | Int | ✓ | — | 日 |
| endDay | Int | — | — | 複数日イベントの終了日 |
| description | String | — | — | 説明 |
| isRecurring | Boolean | ✓ | true | 毎年繰り返し |
| showOnCalendar | Boolean | ✓ | true | カレンダー表示 |
| notes | String | — | — | 備考 |
| createdAt | DateTime | ✓ | now() | — |

#### `member_interactions`（対応履歴）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| memberId | String | ✓ | — | FK → members |
| staffNote | String | ✓ | — | 対応内容メモ |
| category | String | — | — | カテゴリ |
| createdAt | DateTime | ✓ | now() | — |

#### `member_activities`（アクティビティログ）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| memberId | String | ✓ | — | FK → members |
| type | ActivityType | ✓ | — | アクティビティ種別 |
| metadata | Json | — | — | 補足データ（eventId等） |
| score | Int | ✓ | 0 | ポイント付与数 |
| createdAt | DateTime | ✓ | now() | — |

インデックス: `(memberId, createdAt)`

#### `push_subscriptions`（プッシュ通知）

| カラム | 型 | 必須 | デフォルト | 説明 |
|---|---|:---:|---|---|
| id | String(UUID) | ✓ | uuid() | PK |
| userId | String | ✓ | — | FK → users（カスケード削除） |
| templeId | String | ✓ | — | FK → temples（カスケード削除） |
| endpoint | String | ✓ | — | Push ServiceエンドポイントURL |
| p256dh | String | ✓ | — | ECDH公開鍵 |
| auth | String | ✓ | — | 認証シークレット |
| createdAt | DateTime | ✓ | now() | — |

ユニーク制約: `(userId, endpoint)`

### 3.3 Enum定義

#### Role（ユーザーロール）

| 値 | 説明 |
|---|---|
| `SUPER_ADMIN` | システム管理者（将来の多寺院対応用） |
| `ADMIN` | 住職・寺院管理者（全機能アクセス） |
| `STAFF` | 寺院スタッフ（管理機能アクセス、一部制限） |
| `MEMBER` | 一般会員（利用者画面のみ） |

#### AuthProvider（認証プロバイダー）

| 値 | 説明 |
|---|---|
| `EMAIL` | メール+パスワード |
| `GOOGLE` | Google OAuth |
| `APPLE` | Apple OAuth |
| `LINE` | LINE OAuth |

#### MemberType（会員種別）

| 値 | 説明 |
|---|---|
| `DANKA` | 檀家（正式会員）法要予約・過去帳・お布施機能利用可 |
| `GOEN` | ご縁さん（一般会員）イベント参加・お知らせ閲覧 |

#### ReferralSource（流入元）

| 値 | 説明 |
|---|---|
| `SNS` | SNS経由 |
| `WEB` | Webサイト経由 |
| `EVENT` | イベント参加経由 |
| `INTRODUCTION` | 紹介 |
| `WALK_IN` | 飛び込み |
| `OTHER` | その他 |

#### ReservationType（法要種別）

| 値 | 説明 |
|---|---|
| `ANNUAL_MEMORIAL` | 年忌法要（一周忌・三回忌等） |
| `MONTHLY_MEMORIAL` | 月命日 |
| `NIBON` | 新盆 |
| `KUYO` | 供養（水子供養等） |
| `FUNERAL` | 葬儀 |
| `OTHER` | その他 |

#### ReservationStatus

| 値 | 説明 |
|---|---|
| `PENDING` | 申請中（未確認） |
| `CONFIRMED` | 確認済み |
| `COMPLETED` | 完了 |
| `CANCELLED` | キャンセル |

#### EventCategory（イベントカテゴリ）

| 値 | 説明 |
|---|---|
| `ZAZEN` | 坐禅 |
| `SHAKYO` | 写経 |
| `YOGA` | ヨガ |
| `MINDFULNESS` | マインドフルネス |
| `LECTURE` | 仏事講座 |
| `SEASONAL` | 季節行事 |
| `OTHER` | その他 |

#### EventVisibility（公開範囲）

| 値 | 説明 | マルチテンプル対応 |
|---|---|---|
| `PUBLIC` | 誰でも閲覧・申込可（全寺院ユーザー・ご縁さん含む） | ✅ 全員参加可 |
| `MEMBERS_ONLY` | **廃止予定**（既存データ互換のためenum残存、PUBLICと同等扱い） | ✅ 全員参加可 |
| `DANKA_ONLY` | 自寺院に所属する檀家のみ参加可 | ❌ 他寺院・ご縁さん不可 |

#### EventStatus

| 値 | 説明 |
|---|---|
| `DRAFT` | 下書き（非公開） |
| `PUBLISHED` | 公開中・申込受付中 |
| `CLOSED` | 募集終了（申込締切） |
| `COMPLETED` | 開催完了 |
| `CANCELLED` | 開催中止 |

#### ParticipationStatus（参加ステータス）

| 値 | 説明 |
|---|---|
| `APPLIED` | 申込済み |
| `CONFIRMED` | 確定 |
| `WAITLISTED` | キャンセル待ち |
| `ATTENDED` | 参加済み（出席確認済み） |
| `NO_SHOW` | 無断欠席 |
| `CANCELLED` | キャンセル |

#### PaymentStatus（決済ステータス）

| 値 | 説明 |
|---|---|
| `NOT_REQUIRED` | 無料（決済不要） |
| `PENDING` | 決済待ち |
| `PAID` | 支払い済み |
| `REFUNDED` | 返金済み |

#### OfuseType（お布施種別）

| 値 | 説明 |
|---|---|
| `HOUYO` | 法要 |
| `GOJIKAI` | 護持会費 |
| `KIFU` | 寄付 |
| `EVENT_FEE` | イベント参加費 |
| `OTHER` | その他 |

#### AnnouncementTarget（配信対象）

| 値 | 説明 |
|---|---|
| `ALL` | 全会員 |
| `DANKA` | 檀家のみ |
| `GOEN` | ご縁さんのみ |

#### ActivityType（アクティビティ種別）

| 値 | ポイント | 説明 |
|---|:---:|---|
| `LOGIN` | 1 | アプリログイン |
| `NEWS_VIEW` | 2 | お知らせ閲覧 |
| `EVENT_APPLY` | 10 | イベント申込 |
| `EVENT_ATTEND` | 20 | イベント参加（実績） |
| `EVENT_FEEDBACK` | 5 | アンケート回答 |
| `KUYO_APPLY` | 30 | 供養申込（ご縁さん） |
| `CONTACT` | 15 | お寺への問い合わせ |
| `CONSECUTIVE_MONTH` | 10 | 連続月参加ボーナス |

### 3.4 テーブル間リレーション（ER図）

```
temples
  │
  ├──1:N── users
  │           │
  │           └──1:1── members ──1:N── deceased_persons
  │                        │
  │                        ├──1:N── reservations ──N:1── deceased_persons
  │                        ├──1:N── ofuse
  │                        ├──1:N── gojikai_payments
  │                        ├──1:N── event_participations ──N:1── events
  │                        ├──1:N── member_interactions
  │                        └──1:N── member_activities
  │
  ├──1:N── events ──1:N── event_participations
  ├──1:N── reservations
  ├──1:N── ofuse
  ├──1:N── announcements
  ├──1:N── annual_events
  ├──1:N── gojikai_rules
  └──1:N── push_subscriptions ──N:1── users
```

---

## 4. 認証・認可

✅ 実装済み

### 4.1 対応ログイン方法

| 方法 | 実装状況 | 備考 |
|---|:---:|---|
| メール+パスワード | ✅ | Supabase Auth経由、メール確認必須 |
| Google OAuth | ✅ | Supabase OAuth、新規ユーザーはオンボーディングへ |
| LINE OAuth | ✅ | Supabase OAuth経由 |
| Apple OAuth | 🚧 | Supabase設定あり、UI未確認 |

### 4.2 ユーザーロール

| ロール | 説明 | アクセス範囲 |
|---|---|---|
| `SUPER_ADMIN` | システム管理者 | 全機能（多寺院管理想定） |
| `ADMIN` | 住職・管理者 | 全管理機能（スタッフ管理・設定含む） |
| `STAFF` | 寺院スタッフ | 管理機能（スタッフ管理・高度分析除く） |
| `MEMBER` | 一般会員 | 利用者画面のみ |

### 4.3 会員タイプとロールの関係

```
User.role = MEMBER
  └── Member.type = DANKA  → 法要予約・過去帳・お布施履歴にアクセス可
  └── Member.type = GOEN   → イベント・お知らせ・ご縁さん向け機能のみ

User.role = ADMIN / STAFF
  └── Member record は不要（adminとして管理画面にアクセス）
```

### 4.4 認証フロー

#### メール登録フロー

```
[新規登録ページ /auth/register]
    │
    ├── 会員タイプ選択（DANKA / GOEN）
    ├── 名前、メール、パスワード（8文字以上）入力
    ├── 檀家の場合: 家名、住所、電話番号も入力
    │
    ▼
[Server Action: registerWithEmail()]
    ├── Supabase Auth でユーザー作成（メール確認リンク送信）
    ├── DB users レコード作成
    └── DB members レコード作成（type = DANKA or GOEN）
    │
    ▼
[メール確認完了]
    │
    ▼
[/app へリダイレクト]
```

#### Google/LINEログインフロー（新規ユーザー）

```
[/ ログインページ]
    │
    ▼ Googleでログインボタン押下
[Supabase OAuth → Google同意画面]
    │
    ▼
[/auth/callback（route.ts）]
    ├── exchangeCodeForSession()
    ├── DB確認: users & members レコード存在チェック
    │
    ├── レコードなし → [/auth/onboarding へリダイレクト]
    │       │
    │       ▼ オンボーディング画面
    │       ├── 会員タイプ選択（DANKA / GOEN）
    │       ├── 名前（Googleから自動入力）、その他必須項目
    │       │
    │       ▼ POST /api/onboarding
    │       ├── Upsert users レコード
    │       └── Create members レコード
    │           │
    │           ▼ [/app へリダイレクト]
    │
    ├── ADMIN/STAFF → [/admin へリダイレクト]
    │       └── lastLoginAt 更新
    │
    └── MEMBER → [/app へリダイレクト]
            └── lastLoginAt 更新
```

#### ログイン後の振り分けロジック（proxy.ts）

```
認証済みユーザーが / / /auth/login / /auth/register にアクセス:
    │
    ├── DBユーザーなし → /auth/onboarding
    ├── isActive = false → ログインページ（エラー表示）
    ├── member なし + role = MEMBER → /auth/onboarding
    ├── role = ADMIN/SUPER_ADMIN/STAFF → /admin
    └── role = MEMBER（memberあり） → /app
```

### 4.5 セッション管理

- **方式:** Supabase Auth（JWT + Cookie）
- **実装:** `@supabase/ssr` パッケージによるSSR対応Cookie管理
- **Cookieリフレッシュ:** `proxy.ts`（middleware）でリクエスト毎に自動更新

### 4.6 ルーティングガード

| パス | 条件 | 振る舞い |
|---|---|---|
| `/app/*` | 未認証 | `/` へリダイレクト（`?next=` パラメータ付き） |
| `/app/*` | メール未確認 | `/` へリダイレクト（`?error=email_not_confirmed`） |
| `/admin/*` | 未認証 | `/` へリダイレクト |
| `/admin/*` | role = MEMBER | `/app` へリダイレクト |
| `/app/reservations` | type ≠ DANKA | `/app` へリダイレクト |
| `/app/ofuse` | type ≠ DANKA | `/app` へリダイレクト |
| `/` | 認証済み | ロール/タイプに応じて振り分け |

---

## 5. 画面一覧・ルーティング

✅ 実装済み

### 5.1 認証・共通ページ

| パス | アクセス | 概要 |
|---|---|---|
| `/` | 全員 | ログインページ（認証済みは自動リダイレクト） |
| `/auth/login` | 未認証 | `/` へリダイレクト |
| `/auth/register` | 未認証 | 新規会員登録 |
| `/auth/onboarding` | 認証済み（member未登録） | 会員タイプ選択・基本情報登録 |
| `/auth/set-password` | 未認証 | パスワード設定（初回/リセット） |
| `/auth/accept-invite` | 未認証 | スタッフ招待受諾 |
| `/auth/pwa-return` | 未認証 | PWAリターン処理 |
| `/setup` | 未認証（DB空の場合のみ） | 初期寺院セットアップ |
| `/maintenance` | 全員 | メンテナンス画面 |

### 5.2 利用者側ページ（`/app`）

| パス | 対象 | 概要 |
|---|---|---|
| `/app` | 全会員 | ホーム（会員タイプ別に表示内容を切替） |
| `/app/events` | 全会員 | イベント一覧（visibility制御あり） |
| `/app/events/[id]` | 全会員 | イベント詳細 |
| `/app/events/[id]/apply` | 全会員 | イベント申込フォーム |
| `/app/events/[id]/apply/success` | 全会員 | 申込完了・決済完了 |
| `/app/events/[id]/feedback` | 申込済み会員 | イベントフィードバック（★評価+コメント） |
| `/app/events/my` | 全会員 | 自分の申込イベント一覧 |
| `/app/news` | 全会員 | お知らせ一覧 |
| `/app/news/[id]` | 全会員 | お知らせ詳細 |
| `/app/calendar` | 全会員 | 行事カレンダー |
| `/app/reservations` | **檀家のみ** | 法要予約一覧・履歴 |
| `/app/reservations/new` | **檀家のみ** | 法要予約フォーム |
| `/app/ofuse` | **檀家のみ** | お布施履歴閲覧 |
| `/app/deceased` | **檀家のみ** | 過去帳閲覧 |
| `/app/mypage` | 全会員 | プロフィール・通知設定・LINE連携 |

### 5.3 管理側ページ（`/admin`）

| パス | アクセス | 概要 |
|---|---|---|
| `/admin` | ADMIN/STAFF | ダッシュボード（本日予約・統計・転換KPI） |
| `/admin/members` | ADMIN/STAFF | 会員一覧（檀家/ご縁さん一括管理） |
| `/admin/members/[id]` | ADMIN/STAFF | 会員詳細 |
| `/admin/members/[id]/edit` | ADMIN/STAFF | 会員情報編集 |
| `/admin/members/import` | ADMIN/STAFF | CSVインポート |
| `/admin/deceased` | ADMIN/STAFF | 過去帳管理 |
| `/admin/deceased/new` | ADMIN/STAFF | 故人登録 |
| `/admin/deceased/[id]/edit` | ADMIN/STAFF | 故人情報編集 |
| `/admin/reservations` | ADMIN/STAFF | 予約カレンダー・一覧 |
| `/admin/reservations/[id]` | ADMIN/STAFF | 予約詳細・ステータス変更 |
| `/admin/events` | ADMIN/STAFF | イベント管理一覧 |
| `/admin/events/new` | ADMIN/STAFF | イベント作成 |
| `/admin/events/[id]/edit` | ADMIN/STAFF | イベント編集 |
| `/admin/events/[id]/participants` | ADMIN/STAFF | 参加者管理（出席確認・キャンセル） |
| `/admin/events/[id]/analytics` | ADMIN/STAFF | イベント個別分析 |
| `/admin/events/analytics` | **ADMINのみ** | イベント分析ダッシュボード |
| `/admin/analytics` | **ADMINのみ** | → `/admin/events/analytics` へリダイレクト |
| `/admin/ofuse` | ADMIN/STAFF | お布施記録一覧 |
| `/admin/ofuse/new` | ADMIN/STAFF | お布施記録入力 |
| `/admin/gojikai` | ADMIN/STAFF | 護持会費管理 |
| `/admin/reports` | ADMIN/STAFF | 会計レポート |
| `/admin/announcements` | ADMIN/STAFF | お知らせ一覧 |
| `/admin/announcements/new` | ADMIN/STAFF | お知らせ作成 |
| `/admin/announcements/[id]/edit` | ADMIN/STAFF | お知らせ編集 |
| `/admin/annual-events` | ADMIN/STAFF | 年中行事管理 |
| `/admin/conversion` | **ADMINのみ** | ご縁さん→檀家 転換候補管理 |
| `/admin/settings` | ADMIN/STAFF | 寺院設定 |
| `/admin/staff` | **ADMINのみ** | スタッフ管理 |

### 5.4 ボトムナビ構成

#### ご縁さん（GOEN）

```
[🏠 ホーム] [📆 カレンダー] [📅 イベント] [📢 お知らせ] [👤 マイページ]
```

#### 檀家（DANKA）

```
[🏠 ホーム] [📆 カレンダー] [📿 法要予約] [📅 イベント] [📢 お知らせ] [👤 マイページ]
```

※「法要予約」は `isDanka` フラグがtrueの場合のみ表示

### 5.5 管理画面サイドバー構成

```
ダッシュボード
  📊 ダッシュボード    /admin

檀家管理
  📅 予約             /admin/reservations
  👥 会員             /admin/members
  📖 過去帳           /admin/deceased

会計管理
  💴 お布施           /admin/ofuse
  🏦 護持会費         /admin/gojikai
  📊 レポート         /admin/reports

イベント管理
  🎋 イベント         /admin/events
  📊 分析             /admin/events/analytics    ※adminのみ

配信管理
  📢 お知らせ         /admin/announcements
  📅 行事             /admin/annual-events

システム
  ⚙️ 設定             /admin/settings
  👥 スタッフ管理     /admin/staff               ※adminのみ
```

---

## 6. API一覧

✅ 実装済み

### 6.1 認証・ユーザー

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/me` | ✓ | 全員 | 現在のユーザー情報取得 |
| PATCH | `/api/me` | ✓ | 全員 | プロフィール更新（名前・通知設定） |
| POST | `/api/setup` | ✗ | — | 初期寺院セットアップ |
| POST | `/api/onboarding` | ✓ | MEMBER | オンボーディング（会員タイプ登録） |

### 6.2 会員管理

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/members` | ✓ | ADMIN/STAFF | 会員一覧（`?type=DANKA\|GOEN` フィルタ） |
| POST | `/api/members` | ✓ | ADMIN/STAFF | 会員新規登録 |
| GET | `/api/members/[id]` | ✓ | ADMIN/STAFF | 会員詳細 |
| PATCH | `/api/members/[id]` | ✓ | ADMIN/STAFF | 会員情報更新 |
| DELETE | `/api/members/[id]` | ✓ | ADMIN/STAFF | 会員削除 |
| PATCH | `/api/members/[id]/promote` | ✓ | ADMIN/STAFF | ご縁さん→檀家 昇格 |
| GET | `/api/members/[id]/deceased` | ✓ | ADMIN/STAFF | 故人一覧取得 |
| POST | `/api/members/[id]/deceased` | ✓ | ADMIN/STAFF | 故人登録 |
| PATCH | `/api/members/[id]/line-settings` | ✓ | ADMIN/STAFF | LINE通知設定更新 |
| POST | `/api/members/import` | ✓ | ADMIN/STAFF | CSVインポート（multipart） |

### 6.3 イベント

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/events` | △ | — | イベント一覧（visibility制御） |
| POST | `/api/events` | ✓ | ADMIN/STAFF | イベント作成 |
| GET | `/api/events/[id]` | △ | — | イベント詳細 |
| PATCH | `/api/events/[id]` | ✓ | ADMIN/STAFF | イベント編集 |
| DELETE | `/api/events/[id]` | ✓ | ADMIN/STAFF | イベント削除 |
| POST | `/api/events/[id]/participate` | ✓ | MEMBER | イベント申込（無料 or Stripe Checkout） |
| DELETE | `/api/events/[id]/participate` | ✓ | MEMBER | 申込キャンセル |
| GET | `/api/events/[id]/participants` | ✓ | ADMIN/STAFF | 参加者一覧 |
| PATCH | `/api/events/[id]/participants/[pid]` | ✓ | ADMIN/STAFF | 参加ステータス更新 |
| POST | `/api/events/[id]/participants/[pid]/refund` | ✓ | ADMIN/STAFF | 返金処理 |
| GET | `/api/events/[id]/feedback` | ✓ | MEMBER | 自分のフィードバック取得 |
| POST | `/api/events/[id]/feedback` | ✓ | MEMBER | フィードバック送信 |
| POST | `/api/events/[id]/send-feedback-request` | ✓ | ADMIN/STAFF | 参加者へアンケート依頼通知送信 |
| GET | `/api/events/[id]/analytics` | ✓ | ADMIN/STAFF | イベント個別分析データ |
| GET | `/api/events/analytics` | ✓ | ADMIN | 全イベント分析データ |

### 6.4 法要予約

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/reservations` | ✓ | 全員 | 予約一覧（役割で絞り込み） |
| POST | `/api/reservations` | ✓ | MEMBER（DANKA） | 予約作成 |
| GET | `/api/reservations/[id]` | ✓ | 全員 | 予約詳細 |
| PATCH | `/api/reservations/[id]` | ✓ | ADMIN/STAFF | 予約更新・ステータス変更 |
| DELETE | `/api/reservations/[id]` | ✓ | 全員 | 予約キャンセル |
| GET | `/api/reservations/available` | ✓ | MEMBER | 空き時間取得 |

### 6.5 過去帳

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/deceased` | ✓ | ADMIN/STAFF | 全故人一覧 |
| POST | `/api/deceased` | ✓ | ADMIN/STAFF | 故人登録 |
| GET | `/api/deceased/[id]` | ✓ | 全員 | 故人詳細（自分の家のみ） |
| PATCH | `/api/deceased/[id]` | ✓ | ADMIN/STAFF | 故人情報更新 |
| DELETE | `/api/deceased/[id]` | ✓ | ADMIN/STAFF | 故人削除 |
| GET | `/api/deceased/anniversaries` | ✓ | 全員 | 直近の年忌一覧 |

### 6.6 お布施・会計

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/ofuse` | ✓ | ADMIN/STAFF | お布施一覧 |
| POST | `/api/ofuse` | ✓ | ADMIN/STAFF | お布施記録 |
| GET | `/api/ofuse/[id]` | ✓ | ADMIN/STAFF | お布施詳細 |
| PATCH | `/api/ofuse/[id]` | ✓ | ADMIN/STAFF | お布施更新 |
| DELETE | `/api/ofuse/[id]` | ✓ | ADMIN/STAFF | お布施削除 |
| GET | `/api/gojikai` | ✓ | ADMIN/STAFF | 護持会費一覧 |
| POST | `/api/gojikai` | ✓ | ADMIN/STAFF | 護持会費ルール作成 |
| GET | `/api/gojikai/[id]` | ✓ | ADMIN/STAFF | 護持会費詳細 |
| PATCH | `/api/gojikai/[id]` | ✓ | ADMIN/STAFF | 護持会費更新 |
| DELETE | `/api/gojikai/[id]` | ✓ | ADMIN/STAFF | 護持会費削除 |
| GET | `/api/reports/annual` | ✓ | ADMIN/STAFF | 年次レポート |
| GET | `/api/reports/monthly` | ✓ | ADMIN/STAFF | 月次レポート |

### 6.7 お知らせ・行事

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/announcements` | ✓ | 全員 | お知らせ一覧 |
| POST | `/api/announcements` | ✓ | ADMIN/STAFF | お知らせ作成・配信 |
| GET | `/api/announcements/[id]` | ✓ | 全員 | お知らせ詳細 |
| PATCH | `/api/announcements/[id]` | ✓ | ADMIN/STAFF | お知らせ編集 |
| DELETE | `/api/announcements/[id]` | ✓ | ADMIN/STAFF | お知らせ削除 |
| GET | `/api/annual-events` | ✓ | 全員 | 年中行事一覧 |
| POST | `/api/annual-events` | ✓ | ADMIN/STAFF | 年中行事登録 |
| GET | `/api/annual-events/[id]` | ✓ | 全員 | 年中行事詳細 |
| PATCH | `/api/annual-events/[id]` | ✓ | ADMIN/STAFF | 年中行事更新 |
| DELETE | `/api/annual-events/[id]` | ✓ | ADMIN/STAFF | 年中行事削除 |
| GET | `/api/annual-events/template` | ✗ | — | テンプレート取得 |
| GET | `/api/calendar` | ✓ | 全員 | カレンダー用データ |

### 6.8 通知

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| POST | `/api/push/subscribe` | ✓ | 全員 | Webプッシュ通知購読 |
| POST | `/api/push/unsubscribe` | ✓ | 全員 | Webプッシュ通知購読解除 |
| POST | `/api/line/generate-code` | ✓ | MEMBER | LINE連携用6桁コード生成 |

### 6.9 決済

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| POST | `/api/checkout/create-session` | ✓ | MEMBER | Stripe Checkout Session作成 |

### 6.10 Webhook・Cron

| メソッド | パス | 認証方式 | 概要 |
|---|---|---|---|
| POST | `/api/webhooks/stripe` | Stripe署名検証 | 決済完了・返金イベント処理 |
| POST | `/api/webhooks/line` | LINE署名検証 | LINEメッセージ処理（連携コード照合） |
| POST | `/api/cron/engagement` | Bearer `CRON_SECRET` | エンゲージメントスコア再計算 |
| POST | `/api/cron/reminders?type=evening` | Bearer `CRON_SECRET` | 前日リマインダー送信 |
| POST | `/api/cron/reminders?type=morning` | Bearer `CRON_SECRET` | 当日リマインダー送信 |

### 6.11 分析・エクスポート

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/activities` | ✓ | ADMIN | アクティビティログ一覧 |
| GET | `/api/conversion/candidates` | ✓ | ADMIN | 転換候補一覧 |
| GET | `/api/conversion/stats` | ✓ | ADMIN | 転換KPI統計 |
| GET | `/api/export/members` | ✓ | ADMIN/STAFF | 会員CSVエクスポート |
| GET | `/api/export/events` | ✓ | ADMIN/STAFF | イベントCSVエクスポート |
| GET | `/api/export/ofuse` | ✓ | ADMIN/STAFF | お布施CSVエクスポート |

### 6.12 寺院・お気に入り（マルチテンプル対応）

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/temples` | ✗ | — | 有効な寺院一覧取得（`?search=` `?denomination=` フィルタ対応） |
| GET | `/api/temples/[id]` | ✗ | — | 寺院プロフィール詳細 + 近日開催イベント |
| GET | `/api/favorites/temples` | ✓ | MEMBER | お気に入り寺院一覧取得 |
| POST | `/api/favorites/temples` | ✓ | MEMBER | 寺院をお気に入り登録（重複登録は無視） |
| DELETE | `/api/favorites/temples/[id]` | ✓ | MEMBER | お気に入り登録解除 |

### 6.13 スタッフ管理・設定

| メソッド | パス | 認証 | ロール | 概要 |
|---|---|:---:|---|---|
| GET | `/api/staff` | ✓ | ADMIN | スタッフ一覧 |
| POST | `/api/staff` | ✓ | ADMIN | スタッフ追加 |
| POST | `/api/staff/invite` | ✓ | ADMIN | 招待メール送信 |
| GET | `/api/staff/[id]` | ✓ | ADMIN | スタッフ詳細 |
| PATCH | `/api/staff/[id]` | ✓ | ADMIN | スタッフ更新 |
| DELETE | `/api/staff/[id]` | ✓ | ADMIN | スタッフ削除 |
| GET | `/api/settings` | ✓ | ADMIN/STAFF | 寺院設定取得 |
| PATCH | `/api/settings` | ✓ | ADMIN/STAFF | 寺院設定更新 |
| POST | `/api/settings/logo` | ✓ | ADMIN/STAFF | ロゴ画像アップロード |

---

## 7. 主要機能の仕様

### 7.1 会員管理（CRM）

✅ 実装済み

#### 会員登録フロー

```
[管理者がインポートまたは直接登録]
  ↓
users レコード作成（role=MEMBER）
members レコード作成（type=DANKA or GOEN）

[ユーザー自身がサインアップ]
  ↓
/auth/register または OAuth → /auth/onboarding
  ↓
同上
```

#### 檀家とご縁さんの機能差分

| 機能 | 檀家(DANKA) | ご縁さん(GOEN) |
|---|:---:|:---:|
| 法要予約 | ✅ | ❌ |
| 過去帳閲覧 | ✅ | ❌ |
| お布施履歴閲覧 | ✅ | ❌ |
| イベント参加 | ✅ | ✅ |
| お知らせ閲覧 | ✅ | ✅ |
| 家名（familyName）登録 | 必須 | 必須 |
| 住所登録 | 必須 | 任意 |

#### CSVインポート仕様

- **エンドポイント:** `POST /api/members/import`
- **フォーマット:** UTF-8 CSV（ヘッダー行必須）
- **必須カラム:** `name`, `email`, `type`, `familyName`
- **任意カラム:** `phone`, `address`, `postalCode`, `notes`, `joinedDate`
- **バリデーション:** 必須チェック、type値チェック（DANKA/GOEN）、メール形式
- **重複処理:** 同メールのユーザーが既存の場合はスキップ（エラー記録）
- **レスポンス:** 成功件数・失敗件数・失敗詳細を返却

#### ご縁さん→檀家 昇格フロー

```
[管理者が /admin/members/[id] で「昇格」実行]
  ↓
POST /api/members/[id]/promote
  ↓
member.type = DANKA（GOEN → DANKA）
member.promotedAt = 現在日時
member.familyName, address, phone の必須チェック
  ↓
法要予約・過去帳・お布施機能が利用可能になる
```

### 7.2 法要予約

✅ 実装済み

#### 予約作成フロー

```
/app/reservations（檀家のみアクセス可）
  ↓ 「新規予約」ボタン
/app/reservations/new
  ├── 予約種別選択（年忌・月命日・新盆・供養・葬儀・その他）
  ├── カレンダーから日時選択（空き枠確認API呼び出し）
  ├── 故人選択（年忌・月命日・新盆の場合）
  └── 備考入力 → 送信
  ↓
POST /api/reservations
  ├── 重複チェック（reservationConflict.ts）
  └── status = PENDING で作成
  ↓
管理者が確認 → CONFIRMED → 完了後 COMPLETED
```

#### 予約種別

| 種別 | 英語名 | 説明 |
|---|---|---|
| 年忌法要 | `ANNUAL_MEMORIAL` | 一周忌・三回忌・七回忌等 |
| 月命日 | `MONTHLY_MEMORIAL` | 毎月の命日 |
| 新盆 | `NIBON` | 初盆（没後初めてのお盆） |
| 供養 | `KUYO` | 水子供養・永代供養等 |
| 葬儀 | `FUNERAL` | |
| その他 | `OTHER` | |

#### 予約ステータス遷移

```
PENDING → CONFIRMED → COMPLETED
                  ↓
              CANCELLED（いつでもキャンセル可）
```

#### 重複チェックロジック（`reservationConflict.ts`）

- 同日の既存予約と時間帯が重複しないかチェック
- `bookingMaxSlots`（寺院設定）より同時予約数が多くないかチェック
- チェックは `hasTimeOverlap()` 純粋関数で処理

### 7.3 イベント管理

✅ 実装済み

#### イベント作成・公開フロー

```
/admin/events/new
  ├── タイトル、カテゴリ、日時、場所、定員、参加費、公開範囲
  └── 画像アップロード（Supabase Storage）
  ↓
status = DRAFT（下書き保存）
  ↓
管理者が「公開」操作 → status = PUBLISHED
  ↓
利用者画面に表示・申込受付開始
  ↓
「募集終了」操作 → status = CLOSED
  ↓
「完了」操作 → status = COMPLETED
         → アンケート依頼通知送信（手動ボタン）
```

#### 公開範囲（visibility）制御ロジック

| 設定 | 未ログイン | ご縁さん | 檀家 | 管理者 |
|---|:---:|:---:|:---:|:---:|
| `PUBLIC` | 閲覧○申込✗ | ○ | ○ | ○ |
| `MEMBERS_ONLY` | ✗ | ○ | ○ | ○ |
| `DANKA_ONLY` | ✗ | ✗ | ○ | ○ |

#### 参加申込フロー

**無料イベント:**
```
POST /api/events/[id]/participate
  → EventParticipation作成（status=APPLIED, paymentStatus=NOT_REQUIRED）
  → /app/events/[id]/apply/success へリダイレクト
```

**有料イベント:**
```
POST /api/checkout/create-session
  → EventParticipation作成（status=APPLIED, paymentStatus=PENDING）
  → Stripe Checkout Sessionを作成してURLを返す
  → ユーザーをStripe決済ページへリダイレクト
  → 決済完了 → Webhook受信
  → paymentStatus=PAID, status=CONFIRMED に更新
  → Ofuseレコード（EVENT_FEE）を自動作成
```

#### 定員管理・キャンセル待ち（`eventCapacity.ts`）

```typescript
// 申込時の判定ロジック
determineParticipationStatus(currentCount, numGuests, capacity):
  - capacity が NULL → APPLIED（無制限）
  - currentCount + numGuests <= capacity → APPLIED
  - それ以外 → WAITLISTED（キャンセル待ち）
```

### 7.4 お布施・会計管理

✅ 実装済み

#### お布施記録フロー

```
管理者が /admin/ofuse/new でお布施を記録
  ├── 会員選択
  ├── 種別（法要/護持会費/寄付/イベント参加費/その他）
  ├── 金額・納入日・支払い方法
  └── 関連予約の紐付け（任意）
  ↓
Ofuseレコード作成
  ↓
月次・年次レポートに集計
```

#### 護持会費管理

- `GojikaiRule`でルール設定（金額・請求月）
- `GojikaiPayment`で檀家毎・年度毎の支払い状況を管理
- ステータス: `UNPAID`（未納） / `PAID`（納付済み） / `EXEMPT`（免除）

#### 会計レポート集計ロジック

- `GET /api/reports/monthly`: 指定年月のofuse合計（種別別）
- `GET /api/reports/annual`: 指定年のofuse合計（月別・種別別）

### 7.5 Stripe決済連携

✅ 実装済み

#### Checkout Session作成

```
POST /api/checkout/create-session
ボディ: { eventId, numGuests }

処理:
1. イベント取得（fee, title確認）
2. EventParticipation作成（APPLIED, PENDING）
3. stripe.checkout.sessions.create({
     line_items: [{ price_data: { currency: 'jpy', unit_amount: fee }, quantity: numGuests }],
     success_url: '/app/events/{id}/apply/success?session_id={CHECKOUT_SESSION_ID}',
     cancel_url: '/app/events/{id}/apply',
     metadata: { participationId, eventId, memberId }
   })
4. session.url を返す → フロントがリダイレクト
```

#### Webhookで処理するイベント

| Stripeイベント | 処理内容 |
|---|---|
| `checkout.session.completed` | ParticipationをCONFIRMED+PAIDに更新、Ofuse(EVENT_FEE)レコード作成 |
| `charge.refunded` | ParticipationのpaymentStatusをREFUNDEDに更新 |

#### 返金フロー

```
管理者が /admin/events/[id]/participants で返金ボタン押下
  ↓
POST /api/events/[id]/participants/[pid]/refund
  ↓
stripe.refunds.create({ payment_intent: stripePaymentIntentId })
  ↓
Webhookで charge.refunded イベント受信
  ↓
paymentStatus = REFUNDED
```

### 7.6 お知らせ・配信

✅ 実装済み

#### お知らせ作成・配信フロー

```
管理者が /admin/announcements/new で作成
  ├── タイトル・本文入力
  └── 対象セグメント選択（ALL / DANKA / GOEN）
  ↓
「配信する」ボタン → publishedAt に現在日時セット
  ↓
対象会員のプッシュ通知購読リストに一括送信
  ↓
pushSent = true
```

#### セグメント配信

- `AnnouncementTarget.ALL`: 全会員
- `AnnouncementTarget.DANKA`: 檀家のみ（`member.type = DANKA`）
- `AnnouncementTarget.GOEN`: ご縁さんのみ（`member.type = GOEN`）

### 7.7 過去帳管理

✅ 実装済み

#### 年忌計算ロジック（`nenki.ts`）

定義されている年忌:

| 年忌名 | 没後年数 |
|---|---|
| 一周忌 | 1年後 |
| 三回忌 | 2年後 |
| 七回忌 | 6年後 |
| 十三回忌 | 12年後 |
| 十七回忌 | 16年後 |
| 二十三回忌 | 22年後 |
| 二十七回忌 | 26年後 |
| 三十三回忌 | 32年後 |
| 五十回忌 | 49年後 |

- `calcNenki(deathDate)` → 全年忌エントリ一覧
- `getNextNenki(deathDate)` → 今日以降の直近年忌
- `getNenkiForYear(deathDate, year)` → 指定年の年忌名
- `getNenkiDeathYearsForYear(year)` → 指定年に年忌を迎える没年のリスト

### 7.8 通知・リマインダー

✅ 実装済み

#### Web Push通知

- VAPID方式で`web-push`ライブラリを使用
- `push_subscriptions`テーブルでサブスクリプションを管理
- `sendPushNotification()` / `sendPushToMany()` で送信
- 410/404レスポンス時は無効サブスクリプションとして扱う（自動削除は実装者判断）

#### LINE通知連携

**LINE連携フロー:**
```
1. ユーザーが /app/mypage で「LINE連携」ボタン押下
2. POST /api/line/generate-code → 6桁コードを生成（有効期限: 10分）
3. ユーザーがてらログLINE公式アカウントにコードを送信
4. POST /api/webhooks/line がメッセージ受信
5. コード照合 → member.lineUserId に LINE ユーザーID を保存
6. lineNotifyEnabled = true
```

**LINE通知の仕様:**
- 法要リマインダー（前日・当日）
- イベントリマインダー（前日・当日）
- 月命日リマインダー
- 個人の通知設定（notifyReservation / notifyEvent / notifyAnniversary）を尊重

#### Cronジョブスケジュール

| Cronパス | スケジュール（UTC） | JST相当 | 処理内容 |
|---|---|---|---|
| `/api/cron/reminders?type=evening` | `0 9 * * *` | 毎日 18:00 | 翌日の予約・イベントリマインダー |
| `/api/cron/reminders?type=morning` | `0 0 * * *` | 毎日 09:00 | 当日のイベント・月命日リマインダー |
| `/api/cron/engagement` | `0 17 * * *` | 毎日 02:00（翌日） | エンゲージメントスコア一括再計算 |

### 7.9 エンゲージメントスコア

✅ 実装済み

#### スコア算出ロジック

```
engagement_score = min(100, round(Σ(ポイント × 時間減衰係数)))

時間減衰係数 = e^(-0.05 × 経過日数)
  → 90日前の行動は約 1% まで減衰
```

#### 行動別ポイント

| 行動 | ポイント |
|---|---|
| アプリログイン | 1 |
| お知らせ閲覧 | 2 |
| イベント申込 | 10 |
| イベント参加（実績） | 20 |
| アンケート回答 | 5 |
| 供養申込（ご縁さん） | 30 |
| お寺への問い合わせ | 15 |
| 連続月参加ボーナス | 10 |

#### スコアラベルと転換候補判定

| スコア範囲 | ラベル | 転換候補 |
|---|---|:---:|
| 0〜19 | 低 | ✗ |
| 20〜49 | 中 | ✗ |
| 50〜79 | 高 | ✅ |
| 80〜100 | 最高 | ✅ |

転換候補（スコア50以上のご縁さん）は `/admin/conversion` で一覧表示・アプローチ管理が可能。

### 7.10 イベント分析

✅ 実装済み

#### `/admin/events/analytics`（分析ダッシュボード）

- **KPIカード×4:** 今月の開催数・総参加者数・平均参加率・新規ご縁さん獲得数（前月比バッジ付き）
- **月次推移グラフ:** 直近6ヶ月の開催数（棒）＋参加者数（折れ線）ComposedChart
- **カテゴリ別ランキング:** 全期間の参加者数（横棒グラフ）
- **リピーター分析:** 初回のみ / 2回 / 3回以上 の3階層円グラフ
- **イベント別パフォーマンステーブル:** 直近20件、日付/参加率/評価でソート可
- **獲得チャネル分析:** 直近12ヶ月のご縁さん登録者の流入元（棒グラフ）

#### `/admin/events/[id]/analytics`（個別イベント分析）

- 参加状況の内訳（ステータス別件数）
- 申込の日別推移グラフ（折れ線）
- 流入経路別内訳（横棒）
- 会員種別内訳（円グラフ）
- フィードバックスコア分布（棒グラフ）+ コメント一覧
- SNS共有ボタン（Web Share API / URLコピー）
- アンケート依頼送信ボタン（status=COMPLETED のイベントのみ）

---

## 8. コンポーネント設計

✅ 実装済み

### 8.1 共通コンポーネント

| コンポーネント | パス | 説明 |
|---|---|---|
| `Sidebar` | `components/admin/Sidebar.tsx` | 管理画面サイドバー（PC固定 / SPドロワー） |
| `BottomNav` | `components/shared/BottomNav.tsx` | モバイルボトムナビ（isDankaで法要予約を表示制御） |
| `RoleGuards` | `components/shared/RoleGuards.tsx` | ロールベース表示制御ラッパー |
| `ShareButton` | `components/shared/ShareButton.tsx` | Web Share API / URLコピーボタン |

### 8.2 UIコンポーネント（`components/ui/`）

| コンポーネント | 説明 |
|---|---|
| `button.tsx` | ボタン（バリアント: default, outline, ghost） |
| `card.tsx` | カード |
| `checkbox.tsx` | チェックボックス |
| `input.tsx` | テキスト入力 |
| `label.tsx` | フォームラベル |
| `skeleton.tsx` | ローディングスケルトン（`animate-pulse` / `bg-stone-200`） |

### 8.3 ライブラリ関数（`src/lib/`）

| ファイル | エクスポート | 説明 |
|---|---|---|
| `auth.ts` | `getAuthUser()`, `requireAuth()`, `requireAdmin()`, `requireAdminOrStaff()` | サーバーサイド認証チェック |
| `activities.ts` | `logActivity(memberId, type, metadata?)` | アクティビティ記録（エンゲージメント用） |
| `engagementScore.ts` | `calcEngagementScore()`, `scoreToLabel()`, `ACTION_POINTS` | スコア計算ロジック |
| `eventCapacity.ts` | `determineParticipationStatus()`, `calcRemainingSeats()` | 定員・キャンセル待ち判定 |
| `nenki.ts` | `calcNenki()`, `getNextNenki()`, `getNenkiForYear()` | 年忌計算 |
| `push.ts` | `sendPushNotification()`, `sendPushToMany()` | Web Push送信 |
| `line.ts` | `sendLineNotification()`, `verifyLineSignature()` | LINE連携 |
| `reservationConflict.ts` | `hasTimeOverlap()` | 予約重複チェック |
| `stripe.ts` | `getStripe()` | Stripeクライアント（遅延初期化） |
| `utils.ts` | `cn(...classNames)` | Tailwindクラス結合 |

### 8.4 レイアウト構成

```
app/layout.tsx（ルート）
  └── Noto Sans JP フォント、PWAメタタグ、OGP設定

app/(admin)/layout.tsx
  ├── getAuthUser() → 未認証: /リダイレクト
  ├── MEMBER role → /appリダイレクト
  └── <Sidebar> + <main> レイアウト

app/(app)/layout.tsx
  ├── getAuthUser()（nullも許容）
  ├── 管理者バナー（ADMINは /adminへのリンク表示）
  └── <BottomNav isDanka={member.type==="DANKA"}> + コンテンツ
```

### 8.5 ローディングスケルトン

主要ルートに `loading.tsx` を実装済み（Next.js Suspenseバウンダリ）:

- `/admin`（ダッシュボード）
- `/admin/members`（会員一覧）
- `/admin/events`（イベント一覧）
- `/admin/reservations`（予約管理）
- `/admin/ofuse`（お布施）
- `/admin/announcements`（お知らせ）
- `/admin/staff`（スタッフ）
- `/admin/annual-events`（年中行事）
- `/admin/settings`（設定）
- `/admin/members/[id]`（会員詳細）

---

## 9. 外部サービス連携

### 9.1 Supabase

| 機能 | 利用状況 |
|---|---|
| Auth（認証） | ✅ Email+PW / Google / LINE OAuth対応 |
| PostgreSQL | ✅ Prisma + `@prisma/adapter-pg` でアクセス |
| Storage | ✅ イベント画像・寺院ロゴのアップロード先 |
| RLS（行レベルセキュリティ） | ❌ アプリレベルで制御（RLS未設定） |
| Realtime | ❌ 未使用 |

### 9.2 Stripe

| 機能 | 利用状況 |
|---|---|
| Checkout Session | ✅ イベント参加費の決済 |
| Webhook | ✅ 決済完了・返金イベント処理 |
| Refunds API | ✅ 参加費返金 |

### 9.3 LINE Messaging API

| 機能 | 利用状況 |
|---|---|
| Push Message | ✅ 各種リマインダー通知 |
| Webhook | ✅ コード照合によるLINE ID連携 |
| Rich Menu | ❌ 未実装 |
| LIFF | ❌ 未実装 |

### 9.4 Web Push

| 機能 | 利用状況 |
|---|---|
| サブスクリプション管理 | ✅ `push_subscriptions`テーブルで管理 |
| Push通知送信 | ✅ `web-push`ライブラリ + VAPID |
| Safari対応 | ✅ PWAとして動作（iOS 16.4以降） |

### 9.5 その他

| サービス | 利用状況 |
|---|---|
| SendGrid（メール） | 🚧 環境変数定義あり、実装未確認 |
| Firebase Cloud Messaging | ❌ 環境変数定義あり、未実装（Web Push優先） |

---

## 10. セキュリティ

### 10.1 認証方式

- **Supabase Auth:** JWT（アクセストークン + リフレッシュトークン）
- **Cookie:** `@supabase/ssr`によるHTTPOnly Cookie管理
- **proxy.ts:** 全リクエストでCookieを検証・更新

### 10.2 RBACの実装

```typescript
// サーバーサイド認証ヘルパー（src/lib/auth.ts）
getAuthUser()        // 認証チェック（MEMBER以上）
requireAuth()        // 未認証で例外投げる
requireAdmin()       // ADMIN/SUPER_ADMIN以外で例外
requireAdminOrStaff() // ADMIN/SUPER_ADMIN/STAFF以外で例外
```

各APIルートは上記関数で保護。IDORは `templeId` によるスコープ制御で防止（自寺院のデータのみアクセス可）。

### 10.3 入力バリデーション

- APIルート内でフィールドの存在チェック・型チェックを実施
- Prismaの型安全なクエリでSQLインジェクション防止
- 統一されたバリデーションライブラリ（Zod等）は未使用

### 10.4 セキュリティヘッダー

`next.config.ts`で以下のヘッダーを設定:

| ヘッダー | 設定 |
|---|---|
| `Content-Security-Policy` | スクリプト・スタイルのオリジン制限 |
| `Strict-Transport-Security` | HTTPS強制 |
| `X-Frame-Options` | クリックジャッキング防止 |
| `Permissions-Policy` | カメラ・マイク等の制限 |
| `X-Content-Type-Options` | MIMEスニッフィング防止 |

### 10.5 Webhook認証

| エンドポイント | 認証方式 |
|---|---|
| `/api/webhooks/stripe` | `stripe.webhooks.constructEvent()` 署名検証 |
| `/api/webhooks/line` | `crypto.timingSafeEqual()` HMAC-SHA256検証 |
| `/api/cron/*` | `Authorization: Bearer CRON_SECRET` |

### 10.6 レートリミット

❌ 実装なし（Vercelのデフォルト保護に依存）

---

## 10.5 マルチテンプル対応（2026-03-28実装）

### 概要

複数寺院が同一プラットフォームに登録でき、イベントを横断的に表示・参加できる仕組みを実装した。

### DB変更

| テーブル | 変更内容 |
|---|---|
| `temples` | `cover_image_url` / `latitude` / `longitude` / `is_active` を追加 |
| `members` | `temple_id` を NULLable に変更（DANKA:必須 / GOEN:NULL） |
| `member_favorite_temples` | 新規テーブル（ご縁さんのお気に入り寺院） |

### member_favorite_temples テーブル

| カラム | 型 | 説明 |
|---|---|---|
| id | UUID | PK |
| member_id | UUID (FK→members) | ご縁さんの会員ID |
| temple_id | UUID (FK→temples) | お気に入り寺院ID |
| created_at | TIMESTAMP | 登録日時 |
| (unique) | (member_id, temple_id) | 重複登録防止 |

### イベント表示ロジック

| ユーザー種別 | 表示内容 |
|---|---|
| **ご縁さん（お気に入りなし）** | 全寺院のPUBLICイベントを日付順 |
| **ご縁さん（お気に入りあり）** | お気に入り寺院イベント → その他寺院イベントの順 |
| **檀家** | 自寺院イベント（PUBLIC+DANKA_ONLY） → 他寺院PUBLICイベントの順 |

### イベント参加権限マトリクス

| visibility | 自寺院の檀家 | 他寺院の檀家 | ご縁さん |
|---|:---:|:---:|:---:|
| `PUBLIC` | ✅ | ✅ | ✅ |
| `MEMBERS_ONLY` | ✅（廃止予定・PUBLIC扱い） | ✅ | ✅ |
| `DANKA_ONLY` | ✅ | ❌ | ❌ |

### 新規API

| エンドポイント | 説明 |
|---|---|
| `GET /api/temples` | アクティブ寺院一覧（認証不要・オンボーディング用） |
| `GET /api/temples/[id]` | 寺院プロフィール詳細＋公開イベント一覧 |
| `GET /api/favorites/temples` | お気に入り寺院一覧 |
| `POST /api/favorites/temples` | お気に入り追加 |
| `DELETE /api/favorites/temples/[id]` | お気に入り解除 |

### 新規画面

| パス | 説明 |
|---|---|
| `/app/temples/[id]` | 寺院プロフィールページ（ご縁さんがお気に入り登録可能） |

### オンボーディング変更

- **檀家選択時**: 寺院一覧から所属寺院を選択するステップを追加。`members.temple_id` に選択寺院のIDを保存。
- **ご縁さん選択時**: 寺院選択不要。`members.temple_id = NULL`。

---

## 11. 未実装機能・既知の課題

### 11.1 設計書v4に記載されているが未実装の機能

| 機能 | 状況 | 備考 |
|---|---|---|
| Apple OAuth | 🚧 | Supabase側設定要 |
| SendGrid メール送信 | ❌ | 環境変数のみ定義 |
| FCM（Firebase Cloud Messaging） | ❌ | Web Push優先で未実装 |
| 領収書PDF発行 | ❌ | お布施記録UIはあるがPDF生成未実装 |
| お寺へのお問い合わせフォーム (`/app/contact`) | ❌ | ルート定義なし |
| 簡易供養申込 (`/app/kuyo`) | ❌ | ご縁さん向けページ未実装 |
| 家系図ビュー | ❌ | 設計書に記載あり未実装 |
| マルチテナント（複数寺院） | ❌ | DB設計は対応済み、UI未実装 |
| CSVエクスポートUI | 🚧 | APIは実装済み、管理画面UIは未確認 |
| 護持会費の会計レポート統合 | 🚧 | 個別管理画面あり、月次/年次レポートへの統合未確認 |
| LINEリッチメニュー・LIFF | ❌ | |
| ご縁さん→檀家 KPIダッシュボード（転換管理） | ✅ | `/admin/conversion` で実装済み |
| オンライン法要（Zoom連携） | ❌ | |
| AIチャットボット | ❌ | |
| 御朱印帳デジタル化 | ❌ | |

### 11.2 既知の技術的課題・制限事項

1. **Supabase RLS未設定:** アプリレベルのみで認証制御。DBへの直接アクセスに対する保護なし。
2. **レートリミット未実装:** 不正な大量リクエストへの保護が不十分。
3. **入力バリデーション不統一:** Zodなどのスキーマバリデーションライブラリ未導入。各ルートで個別に実装。
4. **エラーレスポンス形式:** APIエラーの形式が一部ルートで統一されていない。
5. **画像アップロード:** Supabase StorageのURLが直接カラムに保存される。削除時の孤立ファイル処理未実装。
6. **プッシュ通知:** 無効なサブスクリプション（410/404）が返ってきた場合のDBレコード自動削除が未実装。

### 11.3 コード内のTODO/FIXMEコメント

コードベース全体を検索した結果、**TODO・FIXMEコメントは存在しない**。

---

## 12. デプロイ・運用

✅ 実装済み

### 12.1 Vercel設定

| 項目 | 設定 |
|---|---|
| フレームワーク | Next.js |
| リージョン | `hnd1`（東京） |
| ビルドコマンド | `npm run build` |
| インストールコマンド | `npm ci` |

### 12.2 デプロイフロー

```
git push origin work/harada
  ↓
Vercel GitHub連携で自動ビルド・デプロイ
  ↓
プレビューデプロイ（PRごとに固有URL）
  ↓
mainブランチマージ → 本番デプロイ（自動）
```

### 12.3 環境

| 環境 | URL | 説明 |
|---|---|---|
| production | `https://temple-app-eosin.vercel.app` | 本番環境（mainブランチ） |
| preview | Vercel発行のURL | PRごとのプレビュー |
| local | `http://localhost:3000` | ローカル開発 |

### 12.4 Cronジョブ（vercel.json）

| パス | スケジュール（cron） | JST換算 | 用途 |
|---|---|---|---|
| `/api/cron/reminders?type=evening` | `0 9 * * *` | 毎日 18:00 | 翌日の予約・イベントリマインダー送信 |
| `/api/cron/reminders?type=morning` | `0 0 * * *` | 毎日 09:00 | 当日のイベント・月命日リマインダー送信 |
| `/api/cron/engagement` | `0 17 * * *` | 毎日 02:00（翌日） | エンゲージメントスコア一括再計算 |

### 12.5 URLリダイレクト設定

| ソース | 宛先 | 種別 |
|---|---|---|
| `/login` | `/auth/login` | 301永続リダイレクト |
| `/register` | `/auth/register` | 301永続リダイレクト |

### 12.6 Next.js設定（next.config.ts）

- **PWA:** `next-pwa`（本番のみ有効、カスタムService Worker: `src/sw-custom.js`）
- **画像最適化:** `*.supabase.co`ドメインを`remotePatterns`で許可
- **セキュリティヘッダー:** CSP・HSTS・X-Frame-Options等を設定

---

*本仕様書はコードベース解析により自動生成されました。設計書v4との差異がある場合はコードの実装を正とします。*
*最終更新: 2026-03-28*
