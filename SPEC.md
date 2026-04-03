# てらログ 仕様書

## 1. アプリ概要

**てらログ**はお寺向けマルチテナントSaaSです。

お寺とその関係者（檀家・ご縁さん）のつながりをデジタル化し、法要・イベント・会員管理・収益管理を一元化します。

### コアバリュー
年忌自動計算 → LINE通知 → 法要予約

---

## 2. 会員システムの設計思想

### 基本コンセプト：複数の関わり方を並列に提供する

旧設計では「ご縁さん → 檀家候補 → 檀家」という一本道のファネルを想定していたが、現実に合わないため廃止。

**なぜ変えたか：**
- 檀家になること自体のハードルが現代では非常に高い
- お寺への関心はあっても檀家化を目的としない人が多い
- 「檀家になること」をゴールにすると関係の入口が狭くなる

**新しい考え方：**
お寺との関わり方に強弱のグラデーションを作り、ハードルの低い入口から関係を育てる。

```
アプリ登録（誰でも）
  │
  ├─ フォロー（誰でも無料）
  │    └─ お気に入り寺院のブログ・イベントを閲覧できる
  │
  ├─ 会員加入（有料サブスクリプション）
  │    └─ 会員限定コンテンツ（ブログ・イベント）にアクセスできる
  │    └─ DANKA・GOENどちらでも加入可能
  │
  └─ 檀家（申し込み制・高ハードル）
       └─ 法要予約・過去帳・護持会費などの仏事フル機能が使える
       └─ 他のお寺のイベント・ブログにも参加可能（フォロー経由）
```

### Member.type の役割

| type | 意味 | 機能アクセス |
|------|------|-----------|
| `GOEN` | ご縁さん | イベント参加、ブログ閲覧、会員加入可 |
| `DANKA` | 檀家 | GOENの全機能 + 法要予約・過去帳・護持会費 |

- `type`はアクセス制御・機能ゲートのみに使う
- ステージ（PROSPECT/DANKA_CANDIDATE等）は廃止済み
- スコアリング・エンゲージメントポイントは廃止済み

### フォロー機能（MemberFavoriteTemple）

- DANKA・GOENどちらも複数の寺院をフォロー可能
- フォロー中の寺院のブログ・イベントを自分の画面に表示
- 会員限定コンテンツは各寺院ごとのサブスクリプションが必要

---

## 3. ユーザーロール

| ロール | 説明 | 画面 |
|--------|------|------|
| `SUPER_ADMIN` | 全テナント管理者（てらログ運営） | `/superadmin/*` |
| `ADMIN` | 寺院管理者（住職等） | `/admin/*` 全機能 |
| `STAFF` | 寺院スタッフ | `/admin/*`（一部機能制限） |
| `MEMBER` | 一般利用者（檀家・ご縁さん） | `/app/*` |

---

## 4. 主要機能

### 利用者画面（/app/*）

| 画面 | 説明 |
|------|------|
| `/app` | マイページ（トップ） |
| `/app/blog` | ブログ一覧（所属＋フォロー寺院の記事） |
| `/app/blog/[id]` | ブログ記事詳細 |
| `/app/events` | イベント一覧・申込 |
| `/app/reservations` | 法要予約（DANKA専用） |
| `/app/calendar` | カレンダー |
| `/app/news` | お知らせ |
| `/app/ofuse` | お布施履歴 |
| `/app/deceased` | 過去帳閲覧（DANKA専用） |
| `/app/subscriptions` | 会員プラン一覧・加入 |
| `/app/mypage` | プロフィール・通知・LINE設定 |
| `/app/mypage/danka-info` | 檀家情報確認・変更申請 |
| `/app/mypage/line` | LINE連携設定 |
| `/app/temples` | お気に入り寺院管理（フォロー） |

### 管理画面（/admin/*）

| 画面 | 説明 |
|------|------|
| `/admin` | ダッシュボード（KPI・グラフ） |
| `/admin/members` | 会員一覧（type/検索フィルタ・CSV export/import） |
| `/admin/members/[id]` | 会員詳細（基本情報・メモ・過去帳・護持会費・LINE・イベント） |
| `/admin/members/[id]/edit` | 会員情報編集 |
| `/admin/members/[id]/family-tree` | 家系図（DANKA専用） |
| `/admin/reservations` | 法要予約管理 |
| `/admin/deceased` | 過去帳管理 |
| `/admin/ofuse` | お布施管理 |
| `/admin/gojikai` | 護持会費管理（年度別・個別金額編集） |
| `/admin/reports` | 収支レポート |
| `/admin/events` | イベント管理 |
| `/admin/events/analytics` | イベント分析 |
| `/admin/announcements` | お知らせ配信 |
| `/admin/blog` | ブログ管理 |
| `/admin/annual-events` | 年中行事 |
| `/admin/line` | LINE配信・ステップ配信 |
| `/admin/revenue` | 収益管理 |
| `/admin/analytics/retention` | 離脱予測・維持率分析 |
| `/admin/churn` | 離脱予兆会員一覧 |
| `/admin/plans` | 会員プラン設定 |
| `/admin/change-requests` | 会員情報変更申請管理 |
| `/admin/settings` | 寺院設定（予約・通知・カスタムカテゴリ） |
| `/admin/staff` | スタッフ管理 |
| `/admin/billing` | プラン・お支払い |
| `/admin/logs` | 操作ログ |
| `/admin/ocr` | OCR取り込み |
| `/admin/onboarding-pack` | 導入サポート |

---

## 5. データモデル概要

### 主要モデル

```
Temple（寺院）
  ├─ User（認証アカウント）
  │    └─ Member（会員プロフィール）
  │         ├─ MemberFavoriteTemple（フォロー寺院）
  │         ├─ MemberSubscription（会員プラン加入）
  │         ├─ MemberNote（メモ・対応履歴）
  │         ├─ DeceasedPerson（過去帳：DANKA専用）
  │         ├─ Reservation（法要予約）
  │         ├─ GojikaiPayment（護持会費：DANKA専用）
  │         ├─ EventParticipation（イベント参加）
  │         └─ Donation（お布施）
  ├─ BlogPost（ブログ記事）
  ├─ Event（イベント）
  ├─ Announcement（お知らせ）
  ├─ MembershipPlan（会員プラン定義）
  └─ GojikaiRule（護持会費ルール）
```

### 廃止済みモデル（削除済み）
- `MemberActivity` / `ActivityType` — アクティビティ記録
- `ScoringEvent` — スコア付与履歴
- `StageTransition` — ステージ遷移履歴
- `ScoringRule` — スコアリングルール
- `Member.engagementScore` / `lifetimeScore` / `stage` — スコアリング関連フィールド

---

## 6. 会員サブスクリプション

- `MembershipPlan` — 各寺院が定義する会員プラン（月額・年額等）
- `MemberSubscription` — 会員のプラン加入状態
- 会員限定コンテンツは `isSubscriberOnly` フラグで管理
- 複数寺院をフォローしている場合、各寺院ごとにサブスクリプションが必要
- `hasActiveSubscription(memberId, templeId)` で確認

---

## 7. 通知システム

| 種別 | タイミング | 対象 |
|------|-----------|------|
| LINE通知 | 予約確認・リマインダー（前日・当日）・命日 | LINE連携済みMEMBER |
| Web Push | 予約・イベント・お知らせ | pushEnabled=true のUSER |
| メール | 予約リマインダー | 全MEMBER |

### LINE連携
- 会員がLINEアプリで連携コードを入力して紐付け
- 通知種別ごとにON/OFF設定可能（通知設定）
- LINEステップ配信（シーケンス）にも対応

### Cronジョブ（Vercel Cron）
- 毎夕: `/api/cron/reminders` — 翌日予約のリマインダー送信
- 日次: `/api/cron/trial-expiry` — トライアル期限チェック
- 日次: `/api/cron/inactive-check` — 未活動会員の離脱予兆チェック
- 定期: `/api/cron/analytics-snapshot` — 分析スナップショット保存

---

## 8. マルチテナント設計

- 全テーブルに `templeId` を持ち、データを寺院単位で完全分離
- `requireAdmin()` / `requireAdminOrStaff()` は認証＋テナントプラン状態を両方確認
- `CANCELLED` / `SUSPENDED` テナントは `PAYMENT_REQUIRED` (402) を返す
- SUPER_ADMIN のみ全テナントを横断参照できる

### プランステータス
```
TRIAL → ACTIVE → PAST_DUE → CANCELLED/SUSPENDED
```

---

## 9. 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js App Router（サーバー＋クライアントコンポーネント） |
| DB | PostgreSQL（Supabase）+ Prisma |
| Prismaクライアント | `src/generated/prisma/client`（`@prisma/client` は使わない） |
| DB管理 | `prisma db push`方式（マイグレーションファイルなし） |
| 認証 | Supabase Auth |
| 決済 | Stripe（プラン課金 + Stripe Connect で各寺院への決済） |
| 通知 | LINE Messaging API / Web Push (VAPID) / メール |
| デプロイ | Vercel（Cron Jobs含む） |
| スタイル | Tailwind CSS |

---

## 10. 認証・権限フロー

```
アクセス
  ↓
getAuthUser() / requireAuth()
  ↓ (認証失敗 → / へリダイレクト)
ロール確認
  ↓ ADMIN/STAFF → /admin/*
  ↓ MEMBER → /app/*
  ↓ SUPER_ADMIN → /superadmin/*
テナントプラン確認（ADMIN/STAFF の場合）
  ↓ CANCELLED/SUSPENDED → 402
処理続行
```

---

## 11. 代理アカウント（高齢者対策）

- 高齢の檀家の代わりに家族がアプリを操作できる
- `Member.proxyUserId` — 代理操作するUserのID
- `Member.proxyRelation` — 続柄（child/grandchild/spouse/other）
- 代理ユーザーは対象会員の画面を操作できる

---

## 12. 操作ログ・監査

- `logActivity()` でAdmin操作を記録（fire-and-forget）
- 対象: 予約・お布施・お知らせ・会員情報・設定変更・エクスポート等
- `/admin/logs` で閲覧可能
- action: create / update / delete / export / import / login / view_sensitive
