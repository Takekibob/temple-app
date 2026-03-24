# てらログ

> お寺DX管理アプリ — 法要予約・会員管理・イベント参加をデジタル化

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| 認証 | Supabase Auth（メール / Google / Apple / LINE） |
| データベース | Supabase PostgreSQL + Prisma ORM v7 |
| ストレージ | Supabase Storage |
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

> Supabase プロジェクト作成: https://supabase.com/dashboard

### 3. Prisma クライアント生成

```bash
npx prisma generate
```

### 4. データベースマイグレーション

```bash
npx prisma migrate dev --name init
```

### 5. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

## ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/        # ログイン・登録ページ
│   ├── (app)/         # 利用者側（檀家・ご縁さん）
│   └── (admin)/       # 管理画面
├── components/
│   ├── ui/            # shadcn/ui コンポーネント
│   ├── shared/        # 共通コンポーネント
│   ├── danka/         # 檀家専用コンポーネント
│   ├── goen/          # ご縁さん専用コンポーネント
│   └── admin/         # 管理画面コンポーネント
├── lib/
│   ├── supabase.ts        # Supabase クライアント（Client Component用）
│   ├── supabase-server.ts # Supabase クライアント（Server Component用）
│   ├── prisma.ts          # Prisma クライアント（@prisma/adapter-pg使用）
│   └── auth.ts            # 認証ユーティリティ
├── hooks/
│   └── useAuth.ts     # 認証フック（useAuth）
├── types/
│   ├── index.ts       # 型定義
│   └── next-pwa.d.ts  # next-pwa 型宣言
└── generated/
    └── prisma/        # Prisma 生成ファイル（自動生成・.gitignore済）
```

## URL 設計

### 利用者側 (`/app` 配下)

| パス | 説明 | 対象 |
|---|---|---|
| `/app` | ホーム | 全員 |
| `/app/events` | イベント一覧 | 全員 |
| `/app/news` | お知らせ | 全員 |
| `/app/reservations` | 予約一覧・履歴 | 檀家のみ |
| `/app/ofuse` | お布施履歴 | 檀家のみ |
| `/app/kuyo` | 供養申込（簡易） | ご縁さんのみ |

### 管理側 (`/admin` 配下)

| パス | 説明 |
|---|---|
| `/admin` | ダッシュボード |
| `/admin/members` | 会員一覧（CRM） |
| `/admin/reservations` | 予約カレンダー |
| `/admin/events` | イベント管理 |
| `/admin/ofuse` | お布施・収入管理 |
| `/admin/reports` | 会計レポート |

## 会員タイプ

| タイプ | 説明 |
|---|---|
| `danka`（檀家） | 護持会費を納める家。法要予約・過去帳・お布施履歴にアクセス可 |
| `goen`（ご縁さん） | 一般会員。SBNRを含むイベント参加が主な用途。檀家への昇格フロー有 |

## ロール

| ロール | 説明 |
|---|---|
| `SUPER_ADMIN` | システム管理者 |
| `ADMIN` | 住職・寺院運営者 |
| `STAFF` | スタッフ |
| `MEMBER` | 一般会員（檀家・ご縁さん） |

## 開発コマンド

```bash
# 型チェック
npx tsc --noEmit

# Prisma スキーマ変更後
npx prisma generate
npx prisma migrate dev --name <変更内容>

# shadcn/ui コンポーネント追加
npx shadcn@latest add <component-name>
```
