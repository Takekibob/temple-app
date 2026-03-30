# てらログ — システム仕様書

> **Single Source of Truth: このドキュメントはコードベースを解析して生成されています。**
> 実装と仕様書に差分がある場合は**実装を正**とします。

**作成日:** 2026-03-28
**最終更新:** 2026-03-30（機能①〜⑧追加: SUPER_ADMIN拡充・レート制限・グラフ・メール拡充・PDF領収書・一斉メール）
**コードベースバージョン:** `work/harada` ブランチ

---

## 目次

1. [システム概要・価値提案](#1-システム概要価値提案)
2. [技術スタック](#2-技術スタック)
3. [インフラ・環境変数](#3-インフラ環境変数)
4. [データベース設計](#4-データベース設計)
5. [認証・認可](#5-認証認可)
6. [画面一覧・ルーティング](#6-画面一覧ルーティング)
7. [API一覧](#7-api一覧)
8. [主要機能の仕様詳細](#8-主要機能の仕様詳細)
9. [外部サービス連携](#9-外部サービス連携)
10. [通知システム](#10-通知システム)
11. [セキュリティ](#11-セキュリティ)
12. [デプロイ・運用](#12-デプロイ運用)
13. [未実装・課題・改善案](#13-未実装課題改善案)

---

## 1. システム概要・価値提案

### 1.1 サービス概要

**てらログ（teralog）**

お寺の日常業務をまるごとデジタル化するSaaS型DX管理アプリ。
法要予約・過去帳・会員管理・お布施会計・イベント運営・メール/LINE/Push通知を一元管理する。

### 1.2 対象顧客とペルソナ

| セグメント | 内容 |
|---|---|
| **プライマリ顧客** | 檀家管理・法要受付・イベント運営に課題を感じている中規模以下の寺院（住職・寺務担当者） |
| **エンドユーザー（檀家）** | 法要を自分でネット予約したい・リマインダーが欲しい中高年層 |
| **エンドユーザー（ご縁さん）** | SBNR（Spiritual But Not Religious）と呼ばれる精神性を求めるが特定の宗教に属さない20〜40代 |

### 1.3 差別化ポイント

| 特徴 | 内容 |
|---|---|
| **会員二分類** | 「檀家（DANKA）」と「ご縁さん（GOEN）」を分離し、それぞれに適した体験を提供 |
| **エンゲージメントスコア** | ご縁さんの関与度を数値化し、檀家への転換候補を自動抽出 |
| **マルチテンプル対応** | 複数寺院が同一プラットフォームに登録でき、ご縁さんは全寺院を横断的に閲覧できる |
| **多チャネル通知** | Web Push・LINE・メール（Resend）を統合した通知基盤 |
| **LINE連携** | 6桁コードで簡単紐付け。月命日・法要リマインダーをLINEで受け取れる |
| **SUPER_ADMIN管理** | SaaS運営者がプラン・寺院・請求を一元管理できる管理画面 |
| **MFA強制** | SUPER_ADMINはTOTP二段階認証必須 |

### 1.4 収益モデル

| プラン | 料金 | 内容 |
|---|---|---|
| **トライアル** | 無料（30日） | 全機能利用可能 |
| **スタンダード** | ¥9,800/月（税込） | 檀家管理・イベント・お知らせ・通知・メールサポート |
| **（将来）プレミアム** | 未定 | 大規模寺院向け（檀家1,000件以上・専用サポート） |

決済はStripeサブスクリプション。サブスク管理はStripe Customer Portalへリダイレクト。

---

## 2. 技術スタック

### 2.1 フレームワーク・ランタイム

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `next` | 16.2.1 | App Router・Server Components・API Routes・PWA |
| `react` | 19.2.4 | UIレンダリング |
| `typescript` | ^5 | 静的型付け |

> **注意:** Next.js 16ではMiddlewareが `middleware.ts` ではなく `src/proxy.ts` に変更。
> `export async function proxy(req)` + `export const config` が規約。

### 2.2 データベース・ORM

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `prisma` | ^7.5.0 | ORM・マイグレーション |
| `@prisma/adapter-pg` | ^7.5.0 | Serverless用アダプター |
| `pg` | ^8.20.0 | PostgreSQLドライバー |

Prismaクライアントは `src/generated/prisma/client` に出力。
型は `import type { ... } from "@/generated/prisma/client"` でインポート。

### 2.3 認証

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `@supabase/supabase-js` | ^2.99.3 | Supabase JSクライアント |
| `@supabase/ssr` | ^0.9.0 | SSR用Cookie管理 |

### 2.4 決済

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `stripe` | ^20.4.1 | サブスクリプション・イベント決済 |

### 2.5 通知・メール

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `resend` | — | トランザクションメール |
| `web-push` | ^3.6.7 | Web Push通知（VAPID） |
| `@line/bot-sdk` | ^10.6.0 | LINE Messaging API |

### 2.6 UI・スタイリング

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `tailwindcss` | ^4 | ユーティリティCSS |
| `shadcn` | ^4.1.0 | UIコンポーネント基盤 |
| `@base-ui/react` | ^1.3.0 | アクセシブルUIプリミティブ |
| `lucide-react` | ^0.577.0 | アイコン |
| `recharts` | ^3.8.1 | グラフ（ダッシュボード） |

### 2.7 ドキュメント・データ処理

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `@react-pdf/renderer` | ^4.3.2 | PDF領収書生成 |
| `papaparse` | ^5.5.3 | CSVパース（会員インポート） |

### 2.8 レート制限

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `@upstash/redis` | — | Redisクライアント（スライディングウィンドウ） |
| `@upstash/ratelimit` | — | レート制限ロジック |

### 2.9 PWA・テスト

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `next-pwa` | ^5.6.0 | Service Worker・オフライン対応 |
| `jest` | ^29.7.0 | 単体テスト |
| `@playwright/test` | ^1.58.2 | E2Eテスト |

---

## 3. インフラ・環境変数

### 3.1 ホスティング構成

| 要素 | サービス |
|---|---|
| フロントエンド・API | **Vercel**（リージョン: `hnd1` 東京） |
| データベース | **Supabase PostgreSQL** |
| 認証 | **Supabase Auth**（JWT + Cookie + TOTP MFA） |
| ファイルストレージ | **Supabase Storage** |
| キャッシュ・レート制限 | **Upstash Redis**（KV） |
| 決済 | **Stripe**（サブスクリプション + 都度払い） |
| メール | **Resend** |
| プッシュ通知 | **Web Push API**（VAPID） |
| メッセージング | **LINE Messaging API** |

### 3.2 環境変数一覧

| 変数名 | 用途 | 必須 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | **必須** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | **必須** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase管理者キー（サーバーのみ） | **必須** |
| `DATABASE_URL` | PostgreSQL接続文字列 | **必須** |
| `NEXT_PUBLIC_SITE_URL` | 本番サイトURL（OGP・OAuth・メール） | **必須** |
| `SUPER_ADMIN_EMAIL` | SUPER_ADMIN登録可能なメールアドレス | **必須** |
| `CRON_SECRET` | Cronジョブ認証Bearer Token | **必須** |
| `STRIPE_SECRET_KEY` | Stripeシークレットキー | **必須** |
| `STRIPE_PUBLISHABLE_KEY` | Stripe公開キー | **必須** |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhookシグニチャー（イベント決済） | **必須** |
| `STRIPE_BILLING_WEBHOOK_SECRET` | Stripe Webhookシグニチャー（サブスク） | **必須** |
| `STRIPE_SUBSCRIPTION_PRICE_ID` | スタンダードプランのPrice ID | **必須** |
| `RESEND_API_KEY` | Resend APIキー | **必須** |
| `FROM_EMAIL` | 送信元メールアドレス（デフォルト: `noreply@teralog.app`） | 任意 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID公開鍵 | **必須** |
| `VAPID_PRIVATE_KEY` | Web Push VAPID秘密鍵 | **必須** |
| `VAPID_SUBJECT` | Web Push件名（`mailto:...`） | **必須** |
| `LINE_CHANNEL_SECRET` | LINE Webhookシグニチャー検証 | **必須** |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot APIアクセストークン | **必須** |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | **必須** |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | **必須** |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Storageバケット名（デフォルト: `teralog-assets`） | 任意 |
| `NEXT_PUBLIC_APP_URL` | ローカル開発URL | 任意（開発） |

---

## 4. データベース設計

### 4.1 ER図（概念）

```
Temple ──< User (role: ADMIN/STAFF)
Temple ──< Member (type: DANKA/GOEN)
Temple ──< Event
Temple ──< Reservation
Temple ──< Ofuse
Temple ──< Announcement
Temple ──< AnnualEvent
Temple ──< GojikaiRule
Temple ──< PushSubscription

Member ──< DeceasedPerson
Member ──< Reservation
Member ──< EventParticipation
Member ──< Ofuse
Member ──< GojikaiPayment
Member ──< MemberActivity
Member ──< MemberFavoriteTemple (N:M with Temple)

Event ──< EventParticipation
```

### 4.2 主要モデル定義

#### Temple（寺院）
| カラム | 型 | 説明 |
|---|---|---|
| `id` | UUID | PK |
| `name` | String | 寺院名 |
| `denomination` | String? | 宗派 |
| `address` | String? | 住所 |
| `phone` | String? | 電話番号 |
| `email` | String? | 問い合わせ先メール |
| `logoUrl` | String? | ロゴ画像URL |
| `description` | String? | 紹介文 |
| `coverImageUrl` | String? | カバー画像URL |
| `latitude` / `longitude` | Decimal? | 緯度経度（地図表示用、将来） |
| `isActive` | Boolean | 有効フラグ |
| `bookingStartTime` | String | 予約受付開始時間（デフォルト: `09:00`） |
| `bookingEndTime` | String | 予約受付終了時間（デフォルト: `17:00`） |
| `bookingDuration` | Int | 1予約あたりの時間（分、デフォルト: 60） |
| `bookingMaxSlots` | Int | 同時間帯最大枠数（デフォルト: 1） |
| `bookingAdvanceDays` | Int | 何日前から予約可能か（デフォルト: 1） |
| `reminderDayBefore` | Boolean | 前日リマインダー送信フラグ |
| `reminderDayBeforeTime` | String | 前日送信時間（デフォルト: `18:00`） |
| `reminderDayOf` | Boolean | 当日リマインダー送信フラグ |
| `reminderDayOfTime` | String | 当日送信時間（デフォルト: `09:00`） |
| `reminderMeinichi` | Boolean | 命日リマインダーフラグ |
| `customEventCategories` | Json | カスタムイベントカテゴリ定義 |
| `planStatus` | PlanStatus | TRIAL / ACTIVE / PAST_DUE / CANCELLED / SUSPENDED |
| `trialEndsAt` | DateTime? | トライアル終了日 |
| `stripeCustomerId` | String? | Stripe顧客ID |
| `stripeSubscriptionId` | String? | Stripeサブスクリプションエー |

#### User（ユーザー・認証アカウント）
| カラム | 型 | 説明 |
|---|---|---|
| `id` | UUID | PK（Supabase Auth UIDと同値） |
| `templeId` | String? | **NULL = SUPER_ADMIN**（寺院に属さない） |
| `role` | Role | SUPER_ADMIN / ADMIN / STAFF / MEMBER |
| `name` | String | 表示名 |
| `email` | String | ユニーク |
| `authProvider` | AuthProvider | EMAIL / GOOGLE / APPLE / LINE |
| `pushToken` | String? | FCMトークン（将来用） |
| `pushEnabled` | Boolean | プッシュ通知有効フラグ |
| `isActive` | Boolean | アカウント有効フラグ |
| `lastLoginAt` | DateTime? | 最終ログイン日時 |

#### Member（会員）
| カラム | 型 | 説明 |
|---|---|---|
| `id` | UUID | PK |
| `templeId` | String? | NULLable（ご縁さんは寺院未所属の場合あり） |
| `userId` | String | User.id（1:1） |
| `type` | MemberType | DANKA / GOEN |
| `familyName` | String | 家名（例: 山田） |
| `engagementScore` | Int | エンゲージメントスコア（0〜100） |
| `promotedAt` | DateTime? | ご縁さん→檀家の転換日時 |
| `referralSource` | ReferralSource? | SNS / WEB / EVENT / INTRODUCTION / WALK_IN / OTHER |
| `interestTags` | Json? | 興味タグ（例: `["zazen","shakyo"]`） |
| `lineUserId` | String? | LINE連携後のユーザーID |
| `lineNotifyEnabled` | Boolean | LINE通知有効フラグ |
| `lineCode` | String? | 連携コード（一時保存） |
| `lineCodeExpiresAt` | DateTime? | 連携コード有効期限 |
| `notifyReservation` | Boolean | 予約通知設定 |
| `notifyEvent` | Boolean | イベント通知設定 |
| `notifyAnniversary` | Boolean | 命日通知設定 |
| `notifyAnnouncement` | Boolean | お知らせ通知設定 |

#### Event（イベント）
| カラム | 型 | 説明 |
|---|---|---|
| `id` | UUID | PK |
| `templeId` | String | 作成寺院 |
| `title` | String | イベント名 |
| `category` | EventCategory | ZAZEN / SHAKYO / YOGA / MINDFULNESS / LECTURE / SEASONAL / OTHER |
| `eventDate` | DateTime | 開催日 |
| `startTime` / `endTime` | String | 開始・終了時刻（HH:MM） |
| `capacity` | Int? | 定員（NULL=無制限） |
| `fee` | Int | 参加費（0=無料） |
| `visibility` | EventVisibility | PUBLIC / MEMBERS_ONLY / DANKA_ONLY |
| `status` | EventStatus | DRAFT / PUBLISHED / CLOSED / COMPLETED / CANCELLED |
| `shareUrl` | String? | SNSシェア用URL |
| `imageUrl` | String? | イベント画像URL |

#### EventParticipation（イベント参加申込）
| カラム | 型 | 説明 |
|---|---|---|
| `status` | ParticipationStatus | APPLIED / CONFIRMED / WAITLISTED / ATTENDED / NO_SHOW / CANCELLED |
| `paymentStatus` | PaymentStatus | NOT_REQUIRED / PENDING / PAID / REFUNDED |
| `numGuests` | Int | 参加人数 |
| `stripeSessionId` | String? | StripeセッションID |
| `stripePaymentIntentId` | String? | Stripe PaymentIntent ID |
| `feedbackScore` | Int? | フィードバックスコア（1〜5） |
| `feedbackComment` | String? | フィードバックコメント |

#### Reservation（法要予約）
| カラム | 型 | 説明 |
|---|---|---|
| `type` | ReservationType | ANNUAL_MEMORIAL / MONTHLY_MEMORIAL / NIBON / KUYO / FUNERAL / OTHER |
| `scheduledAt` | DateTime | 予約日時 |
| `durationMin` | Int | 所要時間（分） |
| `status` | ReservationStatus | PENDING / CONFIRMED / COMPLETED / CANCELLED |
| `deceasedPersonId` | String? | 対象故人 |

#### SuperAdminLog（SUPER_ADMIN操作ログ）
| カラム | 型 | 説明 |
|---|---|---|
| `adminId` | String | 操作者（User.id） |
| `action` | String | TEMPLE_CREATE / PLAN_CHANGE / TEMPLE_SUSPEND 等 |
| `targetType` | String | TEMPLE / USER 等 |
| `targetId` | String? | 対象エンティティID |
| `detail` | String? | 詳細テキスト |

### 4.3 Enum一覧

| Enum | 値 |
|---|---|
| `Role` | SUPER_ADMIN, ADMIN, STAFF, MEMBER |
| `PlanStatus` | TRIAL, ACTIVE, PAST_DUE, CANCELLED, SUSPENDED |
| `MemberType` | DANKA, GOEN |
| `EventCategory` | ZAZEN, SHAKYO, YOGA, MINDFULNESS, LECTURE, SEASONAL, OTHER |
| `EventVisibility` | PUBLIC, MEMBERS_ONLY（廃止予定、PUBLICと同等）, DANKA_ONLY |
| `EventStatus` | DRAFT, PUBLISHED, CLOSED, COMPLETED, CANCELLED |
| `ParticipationStatus` | APPLIED, CONFIRMED, WAITLISTED, ATTENDED, NO_SHOW, CANCELLED |
| `ReservationType` | ANNUAL_MEMORIAL, MONTHLY_MEMORIAL, NIBON, KUYO, FUNERAL, OTHER |
| `ReservationStatus` | PENDING, CONFIRMED, COMPLETED, CANCELLED |
| `OfuseType` | HOUYO, GOJIKAI, KIFU, EVENT_FEE, OTHER |
| `PaymentMethod` | CASH, TRANSFER, ONLINE |
| `ActivityType` | LOGIN, NEWS_VIEW, EVENT_APPLY, EVENT_ATTEND, EVENT_FEEDBACK, KUYO_APPLY, CONTACT, CONSECUTIVE_MONTH |
| `AnnouncementTarget` | ALL, DANKA, GOEN |
| `ReferralSource` | SNS, WEB, EVENT, INTRODUCTION, WALK_IN, OTHER |

---

## 5. 認証・認可

### 5.1 認証フロー

```
[メール/パスワード登録] → Supabase Auth → メール確認 → onboarding
[LINE OAuth]          → Supabase Auth → onboarding
[Google OAuth]        → Supabase Auth → onboarding
```

- セッション管理: Supabase SSR（Cookieベース）
- Cookieはhttponly・SameSite=Lax
- `proxy.ts` でセッションのリフレッシュを担当

### 5.2 ロール別アクセス制御

| ロール | 説明 | templeId |
|---|---|---|
| `SUPER_ADMIN` | SaaS運営者。全寺院を管理。MFA必須 | NULL |
| `ADMIN` | 寺院管理者。自寺院のすべてを管理 | 寺院ID |
| `STAFF` | スタッフ。管理機能の一部を利用可（閲覧・参加ステータス更新等） | 寺院ID |
| `MEMBER` | 一般会員（檀家・ご縁さん）。自分の情報のみ操作可 | 寺院ID（ご縁さんはNULL可） |

### 5.3 認証ヘルパー（`src/lib/auth.ts`）

| 関数 | 説明 | 戻り値 |
|---|---|---|
| `getAuthUser()` | 現在のユーザーを取得（未認証時はnull） | `AuthUser \| null` |
| `requireAuth()` | 未認証時に例外スロー | `AuthUser` |
| `requireAdmin()` | ADMIN以外を拒否 | `AuthUser` |
| `requireAdminOrStaff()` | ADMIN/STAFF以外を拒否 | `AuthUser` |
| `requireSuperAdmin()` | SUPER_ADMIN以外を拒否 | `SuperAdminUser` |

**型定義:**
```typescript
// templeIdはnon-nullableで既存コードとの後方互換を維持
type AuthUser = Omit<User, "templeId"> & { templeId: string; member: Member | null }
type SuperAdminUser = Omit<User, "templeId"> & { templeId: null; member: null }
type TempleAuthUser = AuthUser // エイリアス
```

### 5.4 SUPER_ADMIN専用セキュリティ

1. **初期化**: `/superadmin/init` で1回のみ作成（既存SUPER_ADMINがいれば409）
2. **メール制限**: `SUPER_ADMIN_EMAIL` 環境変数に一致するメールのみ登録可
3. **MFA（TOTP）必須**: `/superadmin/mfa/enroll` でQRコードをスキャンして設定
4. **ログイン2ステップ**: パスワード入力 → TOTPコード入力（`mfa.challenge()` → `mfa.verify()`）
5. **レート制限**: ログイン/初期化は5req/分（Upstash Redis）

### 5.5 `proxy.ts` の役割

Next.js 16のProxyファイル（旧`middleware.ts`相当）で以下を処理:

1. **レート制限チェック**（認証系: 10req/分、SUPER_ADMIN系: 5req/分）
2. **未認証ユーザーのリダイレクト**（`/app`, `/admin` → `/`）
3. **メール未確認ユーザーのブロック**
4. **ログイン済みユーザーをロール別にリダイレクト**（ADMIN→`/admin`、MEMBER→`/app`）
5. **Supabaseセッションリフレッシュ**

---

## 6. 画面一覧・ルーティング

### 6.1 公開ページ

| パス | 説明 |
|---|---|
| `/` | ランディング/ログインページ |
| `/lp` | LP（ランディングページ） |
| `/setup` | 寺院初期セットアップ（新規登録） |
| `/privacy` | プライバシーポリシー |
| `/terms` | 利用規約 |
| `/tokushoho` | 特定商取引法に基づく表記 |
| `/maintenance` | メンテナンス画面 |

### 6.2 認証ページ

| パス | 説明 |
|---|---|
| `/auth/login` | ログイン |
| `/auth/register` | 新規登録 |
| `/auth/onboarding` | 初回プロフィール設定 |
| `/auth/set-password` | パスワード設定 |
| `/auth/forgot-password` | パスワード忘れ |
| `/auth/new-password` | パスワードリセット |
| `/auth/accept-invite` | スタッフ招待受諾 |
| `/auth/pwa-return` | PWAリダイレクトハンドラー |

### 6.3 SUPER_ADMINページ

| パス | 説明 |
|---|---|
| `/superadmin/init` | SUPER_ADMIN初回登録（レイアウト外） |
| `/superadmin/login` | SUPER_ADMINログイン（MFA対応） |
| `/superadmin/mfa/enroll` | MFA（TOTP）設定 |
| `/superadmin` | ダッシュボード |
| `/superadmin/temples` | 全寺院一覧（プラン状態・会員数・管理者情報） |
| `/superadmin/temples/new` | 新規寺院作成（管理者アカウントも同時作成） |
| `/superadmin/temples/[id]` | 寺院詳細・プラン変更・利用状況 |
| `/superadmin/logs` | SUPER_ADMIN操作ログ（直近200件） |

### 6.4 管理者ページ（`/admin/`）

| パス | 説明 |
|---|---|
| `/admin` | ダッシュボード（KPI + 会員登録グラフ + イベント申込グラフ） |
| `/admin/members` | 会員一覧（DANKA/GOEN切替・フィルター・CSV出力） |
| `/admin/members/[id]` | 会員詳細（故人・予約・お布施・エンゲージメント） |
| `/admin/members/import` | 会員CSVインポート |
| `/admin/conversion` | 転換管理（スコア70+のご縁さん一覧） |
| `/admin/deceased` | 過去帳一覧（月命日・年忌フィルター） |
| `/admin/deceased/new` | 故人登録 |
| `/admin/deceased/[id]/edit` | 故人編集 |
| `/admin/events` | イベント一覧（ステータス別タブ） |
| `/admin/events/new` | イベント作成 |
| `/admin/events/[id]/edit` | イベント編集 |
| `/admin/events/[id]/participants` | 参加者管理（ステータス変更・返金・**一斉メール**） |
| `/admin/events/[id]/analytics` | イベント個別分析 |
| `/admin/events/analytics` | イベント横断分析 |
| `/admin/reservations` | 予約一覧（カレンダー/リスト） |
| `/admin/reservations/[id]` | 予約詳細 |
| `/admin/announcements` | お知らせ一覧 |
| `/admin/announcements/new` | お知らせ作成（Push/LINE通知付き） |
| `/admin/announcements/[id]/edit` | お知らせ編集 |
| `/admin/annual-events` | 年中行事管理 |
| `/admin/gojikai` | 護持会費管理（年度別・**催促メール一斉送信**） |
| `/admin/ofuse` | お布施管理（**PDF領収書発行**） |
| `/admin/ofuse/new` | お布施記録 |
| `/admin/reports` | 会計レポート（月次/年次） |
| `/admin/billing` | 課金管理（Stripeポータルへ） |
| `/admin/staff` | スタッフ管理 |
| `/admin/settings` | 寺院設定（予約設定・通知設定・ロゴ） |

### 6.5 会員ページ（`/app/`）

| パス | 説明 |
|---|---|
| `/app` | ホーム（今後のイベント・お知らせ） |
| `/app/events` | イベント一覧（PUBLIC＋DANKA_ONLY） |
| `/app/events/my` | 申込済みイベント |
| `/app/events/[id]` | イベント詳細 |
| `/app/events/[id]/apply` | 参加申込（無料/有料） |
| `/app/events/[id]/apply/success` | 申込完了 |
| `/app/events/[id]/feedback` | フィードバック送信 |
| `/app/calendar` | 月別カレンダー（イベント＋予約＋年中行事） |
| `/app/reservations` | 予約一覧 |
| `/app/reservations/new` | 法要予約（檀家限定） |
| `/app/news` | お知らせ一覧 |
| `/app/news/[id]` | お知らせ詳細 |
| `/app/deceased` | 故人一覧（月命日・年忌） |
| `/app/ofuse` | お布施履歴 |
| `/app/temples/[id]` | 他寺院詳細（マルチテンプル） |
| `/app/mypage` | プロフィール・通知設定・LINE連携 |

---

## 7. API一覧

### 7.1 認証・ユーザー

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET | `/api/auth/me` | 現在ユーザーのロール取得 | 認証済み |
| GET | `/api/me` | ユーザープロフィール取得 | 認証済み |
| PATCH | `/api/me` | ユーザー名更新 | 認証済み |

### 7.2 セットアップ・SUPER_ADMIN

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET/POST | `/api/setup` | 寺院初期セットアップ | 公開 |
| GET/POST | `/api/superadmin/init` | SUPER_ADMIN初期化 | 公開（メール制限あり） |
| GET/POST | `/api/superadmin/temples` | 全寺院一覧取得 / 新規寺院作成 | SUPER_ADMIN |
| GET/PATCH | `/api/superadmin/temples/[id]` | 寺院詳細取得 / 更新 | SUPER_ADMIN |
| POST | `/api/superadmin/temples/[id]/plan` | プラン変更 | SUPER_ADMIN |

### 7.3 会員管理

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET/POST | `/api/members` | 会員一覧/作成 | ADMIN/STAFF |
| GET/PATCH/DELETE | `/api/members/[id]` | 会員詳細/更新/無効化 | ADMIN/STAFF |
| POST | `/api/members/import` | CSV一括インポート | ADMIN |
| POST | `/api/members/[id]/promote` | GOEN→DANKA転換 | ADMIN |
| GET | `/api/members/[id]/deceased` | 会員の故人一覧 | ADMIN/STAFF |
| POST | `/api/members/[id]/line-settings` | LINE通知設定更新 | ADMIN/STAFF |

### 7.4 故人管理

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET/POST | `/api/deceased` | 故人一覧/登録 | ADMIN/STAFF |
| GET/PATCH | `/api/deceased/[id]` | 故人詳細/更新 | ADMIN/STAFF |
| GET | `/api/deceased/anniversaries` | 月命日・年忌一覧 | ADMIN/STAFF |

### 7.5 イベント管理

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET/POST | `/api/events` | イベント一覧/作成 | GET:認証済み, POST:ADMIN/STAFF |
| GET/PATCH/DELETE | `/api/events/[id]` | イベント詳細/更新/削除 | GET:認証済み, 他:ADMIN/STAFF |
| GET | `/api/events/[id]/analytics` | イベント分析 | ADMIN/STAFF |
| POST | `/api/events/[id]/participate` | 参加申込 | 認証済み |
| DELETE | `/api/events/[id]/participate` | 申込キャンセル | 認証済み |
| GET/POST | `/api/events/[id]/participants` | 参加者一覧/管理者追加 | ADMIN/STAFF |
| GET/PATCH | `/api/events/[id]/participants/[pid]` | 参加者詳細/ステータス更新 | ADMIN/STAFF |
| POST | `/api/events/[id]/participants/[pid]/refund` | 返金処理 | ADMIN |
| GET/POST | `/api/events/[id]/feedback` | フィードバック取得/送信 | 認証済み |
| POST | `/api/events/[id]/send-feedback-request` | フィードバック依頼メール | ADMIN/STAFF |
| POST | `/api/events/[id]/send-bulk-email` | 参加者への一斉メール | ADMIN/STAFF |
| GET | `/api/events/analytics` | 全イベント横断分析 | ADMIN/STAFF |

### 7.6 予約管理

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET/POST | `/api/reservations` | 予約一覧/作成 | 認証済み（作成はDANKAのみ） |
| GET/PATCH/DELETE | `/api/reservations/[id]` | 予約詳細/更新/キャンセル | 認証済み |
| GET | `/api/reservations/available` | 空き時間スロット取得 | 認証済み |

### 7.7 お知らせ

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET/POST | `/api/announcements` | お知らせ一覧/作成 | GET:認証済み, POST:ADMIN/STAFF |
| GET/PATCH | `/api/announcements/[id]` | 詳細/更新 | 認証済み |

### 7.8 年中行事

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET/POST | `/api/annual-events` | 一覧/作成 | ADMIN/STAFF |
| GET/PATCH | `/api/annual-events/[id]` | 詳細/更新 | ADMIN/STAFF |
| POST | `/api/annual-events/template` | テンプレート適用 | ADMIN |

### 7.9 お布施・護持会費

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET/POST | `/api/ofuse` | お布施一覧/記録 | 認証済み |
| GET/PATCH | `/api/ofuse/[id]` | 詳細/更新 | 認証済み |
| GET | `/api/ofuse/[id]/receipt` | **PDF領収書生成・ダウンロード** | ADMIN/STAFF |
| GET/POST | `/api/gojikai` | 護持会費一覧/年度一括初期化 | ADMIN/STAFF |
| GET/PATCH | `/api/gojikai/[id]` | 詳細/ステータス更新 | ADMIN/STAFF |
| POST | `/api/gojikai/notify` | **未納者への催促メール一斉送信** | ADMIN |

### 7.10 転換・エンゲージメント

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET | `/api/conversion/candidates` | 転換候補（スコア70+）一覧 | ADMIN/STAFF |
| GET | `/api/conversion/stats` | 転換統計 | ADMIN/STAFF |
| POST | `/api/activities` | アクティビティログ記録 | 認証済み |

### 7.11 エクスポート

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET | `/api/export/members` | 会員CSVエクスポート | ADMIN |
| GET | `/api/export/events` | イベントCSVエクスポート | ADMIN |
| GET | `/api/export/ofuse` | お布施CSVエクスポート | ADMIN |

### 7.12 レポート・カレンダー

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET | `/api/reports/monthly` | 月次レポート | ADMIN |
| GET | `/api/reports/annual` | 年次レポート | ADMIN |
| GET | `/api/calendar` | カレンダー表示用データ | 認証済み |

### 7.13 寺院設定・スタッフ

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET/PATCH | `/api/settings` | 寺院設定取得/更新 | ADMIN/STAFF |
| POST | `/api/settings/logo` | ロゴアップロード | ADMIN |
| GET/POST | `/api/staff` | スタッフ一覧/作成 | ADMIN |
| PATCH/DELETE | `/api/staff/[id]` | スタッフ更新/無効化 | ADMIN |
| POST | `/api/staff/invite` | スタッフ招待メール送信 | ADMIN |

### 7.14 マルチテンプル・お気に入り

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| GET | `/api/temples` | 全アクティブ寺院一覧 | 公開 |
| GET/PATCH | `/api/temples/[id]` | 寺院詳細/更新 | GET:公開, PATCH:ADMIN |
| GET/POST | `/api/favorites/temples` | お気に入り寺院取得/追加 | 認証済み |
| DELETE | `/api/favorites/temples/[id]` | お気に入り解除 | 認証済み |

### 7.15 決済

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| POST | `/api/checkout/create-session` | イベント決済セッション作成 | 認証済み |
| POST | `/api/billing/create-subscription` | サブスクリプション作成 | ADMIN |
| GET | `/api/billing/portal` | Stripe顧客ポータルURL取得 | ADMIN |
| GET | `/api/billing/status` | サブスクリプション状態確認 | ADMIN |
| POST | `/api/webhooks/stripe` | Stripe Webhook（イベント決済） | Stripe署名検証 |
| POST | `/api/webhooks/stripe-billing` | Stripe Webhook（サブスク） | Stripe署名検証 |

### 7.16 通知・Push

| メソッド | パス | 説明 | 権限 |
|---|---|---|---|
| POST | `/api/push/subscribe` | Push通知登録 | 認証済み |
| POST | `/api/push/unsubscribe` | Push通知解除 | 認証済み |
| POST | `/api/line/generate-code` | LINE連携コード生成（6桁・10分有効） | 認証済み |
| POST | `/api/webhooks/line` | LINE Webhook処理 | LINE署名検証 |

### 7.17 Cronジョブ

| メソッド | パス | 実行タイミング | 内容 |
|---|---|---|---|
| POST | `/api/cron/engagement` | 毎日 17:00 UTC（02:00 JST） | エンゲージメントスコア再計算 |
| POST | `/api/cron/reminders` | 毎日 09:00/18:00 JST | リマインダー通知送信 |
| GET | `/api/cron/trial-expiry` | 毎日 09:00 JST | トライアル期限メール送信 |

---

## 8. 主要機能の仕様詳細

### 8.1 エンゲージメントスコア

会員（ご縁さん）のプラットフォームへの関与度を0〜100で数値化する。

**計算式:**
```
score = min(100, Σ(activity.score × e^(-0.05 × days_ago)))
```
直近の行動ほど高いウェイト。90日以上前の行動は自然減衰。

**アクティビティポイント:**

| アクティビティ | スコア |
|---|---|
| LOGIN | 1 |
| NEWS_VIEW | 2 |
| EVENT_APPLY | 10 |
| EVENT_ATTEND | 15 |
| EVENT_FEEDBACK | 5 |
| KUYO_APPLY | 20 |
| CONTACT | 8 |
| CONSECUTIVE_MONTH | 5 |

**スコア判定:**
- 70以上 → 転換候補（DANKA昇格提案）
- 40〜69 → アクティブ
- 0〜39 → 要育成

### 8.2 イベント可視性制御

| visibility | 閲覧可能対象 |
|---|---|
| PUBLIC | 全ユーザー（未ログインも含む将来検討） |
| MEMBERS_ONLY | 廃止予定。PUBLICと同等に扱う |
| DANKA_ONLY | 自寺院のDANKAのみ |

マルチテンプル環境では、ご縁さんは全寺院のPUBLICイベントを参照できる。

### 8.3 予約スロット管理

寺院設定（`Temple`モデル）で以下を制御:

- `bookingStartTime` / `bookingEndTime`: 受付時間帯
- `bookingDuration`: 1予約あたりの所要時間（分）
- `bookingMaxSlots`: 同時間帯の最大予約数
- `bookingAdvanceDays`: 何日前から予約可能か

`GET /api/reservations/available` で空きスロット一覧を返す。

### 8.4 LINE連携フロー

```
1. 会員が /app/mypage で「LINE通知を設定」をクリック
2. POST /api/line/generate-code → 6桁コード生成（10分有効）
3. 会員がLINE公式アカウントに「XXXX」と送信
4. LINE Webhook が受信 → DB検索 → Member.lineUserId を保存
5. 以降はLINEでリマインダー受信可能
```

### 8.5 お布施 領収書PDF（`GET /api/ofuse/[id]/receipt`）

`@react-pdf/renderer` v4を使用してA4縦サイズのPDF領収書を生成。

**記載内容:**
- 領収書No.（ofuse ID先頭8文字）
- 宛名（会員名）
- 金額
- 但し書き（お布施種別）
- 支払日・支払方法
- 寺院名・印鑑欄
- 発行日

発行時に `Ofuse.receiptIssued = true` を自動更新。

フォント: NotoSansJP（Googleフォント CDNから取得）

### 8.6 護持会費管理フロー

```
1. 管理者が /admin/gojikai で「年度初期化」
2. POST /api/gojikai → 全DANKA会員分のGojikaiPaymentレコードを一括upsert
3. 各会員の支払い状況を UNPAID/PAID/EXEMPT で管理
4. 「未納者に催促メール」ボタン → POST /api/gojikai/notify → sendGojikaiReminderEmail
```

### 8.7 イベント参加者への一斉メール

参加者管理画面（`/admin/events/[id]/participants`）の「一斉メール」ボタンからモーダルを開き:

- 送信対象ステータスを選択（申込/確定/参加済）
- 件名・本文を入力
- 「送信する」→ `POST /api/events/[id]/send-bulk-email`

件名には自動で `【イベント名】` が付与される。

### 8.8 メール通知一覧

| 関数 | トリガー |
|---|---|
| `sendWelcomeEmail()` | SUPER_ADMINが新規寺院作成時 → 管理者へ |
| `sendEventConfirmationEmail()` | 参加者ステータスがCONFIRMEDに変更時 |
| `sendReservationReminderEmail()` | Cronジョブ（前日18:00）から呼び出し |
| `sendGojikaiReminderEmail()` | 管理者が護持会費催促メール送信時 |
| `sendTrialExpiryEmail()` | Cronジョブ（毎日09:00）、残り7日・0日で送信 |

### 8.9 ダッシュボードグラフ（管理者）

`recharts` ライブラリを使用したクライアントコンポーネント（`DashboardCharts.tsx`）。

**グラフ1: 会員登録推移（過去6ヶ月）**
- 棒グラフ（Bar）
- 檀家（amber）/ ご縁さん（teal）を積み上げ

**グラフ2: イベント申込推移（過去6ヶ月）**
- 折れ線グラフ（Line）
- キャンセル除く申込数

データはServer Componentで集計し、シリアライズしてクライアントに渡す。

### 8.10 マルチテンプル対応

- 寺院ごとに完全にデータが分離（`templeId` でテナント分離）
- `/api/temples` で全寺院を公開取得
- `MemberFavoriteTemple` でご縁さんが複数寺院をフォロー可能
- SUPER_ADMINが寺院・管理者アカウントをプロビジョニング

---

## 9. 外部サービス連携

### 9.1 Supabase

| 機能 | 説明 |
|---|---|
| **Auth** | メール/パスワード・OAuth（Google, Apple, LINE）・JWT発行 |
| **MFA** | TOTP（Time-based OTP）。SUPER_ADMINに必須 |
| **PostgreSQL** | メインDB。Prisma ORMで操作 |
| **Storage** | 寺院ロゴ・イベント画像の保存（バケット: `teralog-assets`） |
| **Admin API** | `createUser`, `listUsers`, `updateUser` 等（サーバーサイドのみ） |

### 9.2 Stripe

| 機能 | 説明 |
|---|---|
| **サブスクリプション** | スタンダードプラン ¥9,800/月。`create-subscription` APIで作成 |
| **Customer Portal** | 解約・支払方法変更はPortalへリダイレクト |
| **イベント決済** | 有料イベントの一回払い。`create-session` → Checkout |
| **Webhook（イベント決済）** | `checkout.session.completed` → `EventParticipation.paymentStatus = PAID` |
| **Webhook（サブスク）** | `invoice.paid` / `customer.subscription.deleted` → `Temple.planStatus` 更新 |
| **返金** | `POST /api/events/[id]/participants/[pid]/refund` → Stripe返金 |

### 9.3 LINE Messaging API

| 機能 | 説明 |
|---|---|
| **Webhook受信** | followイベント・テキストメッセージを処理 |
| **アカウント連携** | 6桁コードによる会員とLINEアカウントの紐付け |
| **通知送信** | 予約リマインダー・イベントリマインダー・命日通知 |

連携コードは10分間有効（`lineCode`, `lineCodeExpiresAt` でDB管理）。

### 9.4 Resend

メールサービス。`FROM_EMAIL` を送信元として日本語メールを送信。

| テンプレート | 送信タイミング |
|---|---|
| ウェルカムメール | 新規寺院・管理者作成時 |
| イベント参加確定メール | ステータスCONFIRMED変更時 |
| 予約リマインダー | 前日Cron（18:00 JST） |
| 護持会費催促 | 管理者が手動送信 |
| トライアル期限通知 | 残り7日/0日でCron送信 |

### 9.5 Upstash Redis

| 用途 | 設定 |
|---|---|
| 認証系レート制限 | スライディングウィンドウ 10req/分（`ratelimit:auth` prefix） |
| SUPER_ADMIN系レート制限 | スライディングウィンドウ 5req/分（`ratelimit:superadmin` prefix） |

`proxy.ts` で全リクエストの先頭で評価。429返却時にはX-RateLimit-*ヘッダーも付与。

### 9.6 Web Push（VAPID）

| 機能 | 説明 |
|---|---|
| **登録** | `POST /api/push/subscribe` でエンドポイント・鍵を保存 |
| **送信** | Cronジョブから `web-push` ライブラリで送信 |
| **クリーンアップ** | 410/404エラーのサブスクリプションをCron実行時に自動削除 |

---

## 10. 通知システム

### 10.1 通知チャネルの優先順位

会員の設定 (`notifyReservation`, `notifyEvent`, `notifyAnniversary`, `notifyAnnouncement`) に従い:

1. **Web Push**（`PushSubscription`が存在する場合）
2. **LINE**（`lineUserId`が設定されている場合）
3. **メール**（Resend経由）

### 10.2 Cronジョブ詳細

#### エンゲージメントスコア再計算（`/api/cron/engagement`）

```
対象: 全寺院の全会員
処理:
  1. 直近90日のMemberActivityを取得
  2. score = Σ(activity.score × e^(-0.05 × days)) をクランプ(0, 100)
  3. Member.engagementScore を更新
```

#### リマインダー通知（`/api/cron/reminders`）

**夕方バッチ（18:00 JST, `type=evening`）:**
- 翌日の確定済み予約を持つ会員へPush/LINE通知
- 翌日のPUBLISHEDイベント参加者へPush/LINE通知

**朝バッチ（09:00 JST, `type=morning`）:**
- 当日のイベント参加者へPush/LINE通知
- 月命日の会員へPush/LINE通知

#### トライアル期限（`/api/cron/trial-expiry`）

- `planStatus = TRIAL` かつ `trialEndsAt = 今日から7日後` の寺院のADMINへメール
- `planStatus = TRIAL` かつ `trialEndsAt = 今日` の寺院のADMINへ「終了」メール

---

## 11. セキュリティ

### 11.1 認証・認可

- 全APIエンドポイントでロール検証（`requireAdmin()`, `requireSuperAdmin()` 等）
- SupabaseのRow Level Security（RLS）はPrisma経由のため無効化、アプリ層で制御
- Webhook検証: StripeはHTTPシグニチャー、LINEはHMAC-SHA256シグニチャー

### 11.2 レート制限

| パス | 制限 | 目的 |
|---|---|---|
| `/api/auth/callback` | 10req/分 | ブルートフォース対策 |
| `/superadmin/login` | 5req/分 | 管理者ログイン保護 |
| `/superadmin/init` | 5req/分 | 初期化エンドポイント保護 |
| `/api/superadmin/init` | 5req/分 | 同上 |

識別子: `x-forwarded-for` または `x-real-ip` ヘッダーによるIPアドレス。

### 11.3 SUPER_ADMIN特別保護

1. Supabase MFAの `aal2` レベルを要求
2. メールアドレスを環境変数で事前許可
3. 専用ログイン画面（`/superadmin/login`）
4. 全操作が `SuperAdminLog` に記録される

### 11.4 入力検証

- Prismaの型安全性でSQLインジェクション防止
- APIルートで `JSON.parse()` 後のフィールドを個別バリデーション
- ファイルアップロードはSupabase Storageに直接（サーバー非経由）

### 11.5 Cookie・セッション

- HTTPOnly Cookie（XSS対策）
- `proxy.ts` でSessionリフレッシュ
- SUPER_ADMINはセッション内でMFA検証済みフラグを管理

---

## 12. デプロイ・運用

### 12.1 デプロイフロー

```
git push → Vercel 自動デプロイ（work/haradaブランチ）
         → prisma generate → next build
```

### 12.2 DBマイグレーション

```bash
npx prisma db push           # スキーマ反映（開発・staging）
npx prisma generate          # クライアント再生成（ビルド時に自動実行）
```

### 12.3 Cronジョブ設定

Vercel Cronを使用（`vercel.json` または Vercel Dashboard）:

```
毎日 09:00 JST → GET  /api/cron/trial-expiry       (Authorization: Bearer CRON_SECRET)
毎日 09:00 JST → POST /api/cron/reminders?type=morning
毎日 18:00 JST → POST /api/cron/reminders?type=evening
毎日 17:00 UTC → POST /api/cron/engagement
```

### 12.4 初期セットアップ手順（新環境）

```
1. Vercelプロジェクト作成・環境変数設定
2. Supabaseプロジェクト作成・Auth設定（OAuth Provider追加）
3. Upstash Redis作成・環境変数設定
4. Stripe商品・Price作成・Webhook設定
5. LINE公式アカウント・チャネル設定
6. Resend送信ドメイン設定
7. npx prisma db push でスキーマ反映
8. /superadmin/init でSUPER_ADMIN登録
9. /superadmin/mfa/enroll でMFA設定
10. /superadmin/temples/new で最初の寺院を登録
```

---

## 13. 未実装・課題・改善案

### 13.1 未実装機能

| 機能 | 優先度 | 備考 |
|---|---|---|
| **予約リマインダーメール** | 高 | `sendReservationReminderEmail()` は実装済みだが、Cronから呼び出していない |
| **Stripe Billing Webhook完全実装** | 高 | `PAST_DUE` → 機能制限ロジックが未実装 |
| **機能アクセスのプラン制限** | 高 | SUSPENDED/CANCELLEDテナントでも操作できてしまう |
| **SUPER_ADMINダッシュボード** | 中 | 現状は寺院一覧・ログのみ。売上・MRRグラフ等が未実装 |
| **管理者ダッシュボードKPIグラフ** | 中 | 月次売上・護持会費回収率等のグラフ |
| **報告書PDF出力** | 中 | レポートページはあるがPDF化未実装 |
| **会員ポータルの予約キャンセル** | 中 | 現状は管理者のみキャンセル可能 |
| **SNSシェア機能の完全実装** | 低 | `shareUrl` フィールドはあるが動的OGP未実装 |
| **地図表示** | 低 | `latitude`/`longitude` フィールドはあるが地図UIが未実装 |
| **多言語対応（i18n）** | 低 | 現状は日本語のみ |
| **管理者向けモバイルアプリ** | 低 | 現状はPWA対応のWebのみ |

### 13.2 技術的負債・既知の課題

| 課題 | 内容 |
|---|---|
| `EventVisibility.MEMBERS_ONLY` | 廃止予定だが既存データのため残存。コード内でPUBLICと同等処理 |
| レート制限の対象が限定的 | `/api/superadmin/temples` (POST)などにレート制限がない |
| PDF領収書のフォント | CDNからNotoSansJPを取得。オフライン/CDN障害時に文字化けリスク |
| Cronジョブ認証 | Bearer Tokenのみ。IPホワイトリストがVercelでは困難 |
| テストカバレッジ | ユニット・E2Eテストが未整備 |
| `proxy.ts` のDB直接アクセス | `import { prisma }` がProxy内で行われており、コールドスタート影響あり |

### 13.3 スケーラビリティの課題

| 項目 | 現状 | 改善案 |
|---|---|---|
| 画像最適化 | Supabase Storage直接URL | next/image + CDN |
| N+1問題 | Prismaのinclude多用 | 必要に応じてクエリ最適化 |
| メール送信 | Resend直接（同期） | キュー化（Inngest等） |
| エンゲージメントCron | 全会員を毎日処理 | 更新が必要なもののみ差分処理 |

---

*最終更新: 2026-03-30 — コードベース `work/harada` ブランチを元に自動解析して生成*
