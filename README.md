# てらログ

> お寺DX管理アプリ — イベント・フォロー・お知らせ・寺院プロフィールの4機能に特化

## コア機能

| 機能 | 説明 |
|---|---|
| イベント管理 | GROUP（グループ開催）/ BOOKING（個別予約型）。複製ボタンで定例イベントを簡単作成 |
| フォロー | 誰でも複数の寺院をフォロー。FOLLOWERS_ONLY イベントへのアクセスが解放される |
| お知らせ | 管理者から全フォロワーへのブロードキャスト配信。プッシュ通知 / LINE 連携 |
| 寺院プロフィール | 宗派・都道府県・説明文・SNSリンク。宗派・都道府県・テキストで検索可能 |

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| 認証 | Supabase Auth（メール / Google / Apple / LINE） |
| データベース | Supabase PostgreSQL + Prisma ORM v7 |
| ストレージ | Supabase Storage |
| 決済 | Stripe Connect（寺院オプション・イベント参加費のみ） |
| PWA | next-pwa |

## セットアップ手順

### 1. リポジトリのクローン & 依存インストール

```bash
git clone <repository-url>
cd temple-app
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集して Supabase の値を入力:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 3. Prisma クライアント生成 & DB 同期

```bash
npx prisma generate
npx prisma db push
```

### 4. 開発サーバー起動

```bash
npm run dev
```

## 主要 URL

| パス | 説明 |
|---|---|
| `/admin` | 寺院管理画面（ダッシュボード） |
| `/admin/events` | イベント管理 |
| `/admin/members` | フォロワー管理 |
| `/admin/settings` | 寺院設定・決済設定 |
| `/app` | 利用者ホーム |
| `/app/temples` | 寺院検索 |
| `/superadmin` | プラットフォーム管理（SUPER_ADMIN のみ） |

## ライセンス

Proprietary — All rights reserved.
