@AGENTS.md

# てらログ — 設計思想・開発ガイド

> 詳細な機能仕様は `SPEC.md` を参照してください。

---

## アプリの目的

**てらログ**はお寺向けマルチテナントSaaSです。
お寺とその関係者（檀家・ご縁さん）のつながりをデジタル化し、法要・イベント・会員管理を一元化します。

コアバリュー：**年忌自動計算 → LINE通知 → 法要予約**

---

## 会員システムの設計思想（最重要）

### 複数の関わり方を並列に提供する

「ご縁さん→檀家」という一本道のファネルは廃止。ステージ・スコアリング概念は存在しない。

```
フォロー（誰でも）   ─→  お気に入り寺院のブログ・イベントを見られる
会員加入（有料）     ─→  会員限定コンテンツにアクセスできる（DANKA/GOEN両方可）
檀家（申し込み制）   ─→  法要・過去帳・護持会費などの仏事フル機能が使える
```

これらは上下関係・昇格パスではなく、**並列な関わり方**。檀家がご縁さんより上位というわけではない。

### Member.type の役割

- `GOEN`（ご縁さん）— イベント・ブログ・会員加入可
- `DANKA`（檀家）— GOENの全機能 + 法要予約・過去帳・護持会費

`type`はアクセス制御のゲートのみに使う。スコアやステージは存在しない。

### フォロー（MemberFavoriteTemple）

DANKA・GOENどちらも複数の寺院をフォロー可能。会員限定コンテンツは各寺院ごとのサブスクリプションが必要。

---

## 技術的ルール

### Prismaインポート
```typescript
// ✅ 正しい
import { prisma } from "@/lib/prisma";
import type { Member } from "@/generated/prisma/client";

// ❌ 使わない
import { PrismaClient } from "@prisma/client";
```

### DB管理
`prisma db push` 方式（マイグレーションファイルなし）。スキーマ変更後は `npx prisma db push` を実行。

### fire-and-forget パターン
`logActivity()` は `await` しない（メイン処理を止めない）：
```typescript
logActivity({ ... }); // awaitしない
```

### 認証・テナント確認
- 利用者画面: `getAuthUser()` → MEMBER確認
- 管理画面: `requireAdminOrStaff()` → 認証＋プラン確認（CANCELLED/SUSPENDEDは402）
- 全クエリに `templeId` スコープを必ず付ける

### 新機能追加時のチェックリスト
1. `templeId` でデータをスコープしているか
2. `type`（DANKA/GOEN）でゲートが必要か
3. サブスクリプション確認が必要か（`hasActiveSubscription(memberId, templeId)`）
4. フォロー中の寺院も対象に含めるべきか（`MemberFavoriteTemple`）

### stale state 対策
タブ切り替え・年度切り替えを持つClientコンポーネントには `key={fiscalYear}` 等を付けて再マウントを強制する。

### 日本会計年度
4月始まり → 1〜3月は前年度扱い：
```typescript
const currentFiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
```

---

## URL構造

| パス | 対象 |
|------|------|
| `/admin/*` | 管理画面（ADMIN/STAFF） |
| `/app/*` | 利用者画面（MEMBER） |
| `/superadmin/*` | スーパー管理者（SUPER_ADMIN） |
| `/api/*` | API Routes |
| `/lp` | ランディングページ |

---

## 廃止済み（コードに書かない）

以下は削除済みの概念。コードに追加しないこと：

- `Member.stage` / `MemberStage` enum — ステージ管理
- `Member.engagementScore` / `lifetimeScore` — スコアリング
- `ScoringEvent` / `ScoringRule` / `StageTransition` — 関連モデル
- `awardScore()` / `changeStage()` / `logMemberActivity()` — 関連関数
- パイプライン・転換管理 — CRMファネル画面
