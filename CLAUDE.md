@AGENTS.md

# てらログ — v2 設計思想・開発ガイド

> 詳細な機能仕様は `SPEC.md` を参照してください。

---

## アプリの目的

**てらログ**はお寺向けマルチテナントSaaSです。
お寺とその関係者（フォロワー）のつながりをデジタル化し、イベント・フォロー・お知らせ・寺院プロフィールを一元化します。

### v2 コアバリュー
**寺院プロフィール → フォロー → イベント参加 / お知らせ受信**

### v2 方針（厳守）
- 寺院から課金しない（完全無料運営）
- Stripe は寺院オプションの**イベント決済のみ**（Stripe Connect）
- 仏事系機能（法要・過去帳・戒名・年中行事・護持会費）なし
- ブログ・メンバーシップ（有料会員）・寄付・ステップ配信なし
- UI に「ご縁さん」「檀家」「メンバーシップ」を出さない
- **コア機能 4つのみ**: イベント / フォロー / お知らせ / 寺院プロフィール

---

## 会員システムの設計思想（v2）

### シンプルな2役モデル

```
フォロー（誰でも）   ─→  お気に入り寺院のイベント・お知らせを見られる
フォロワー限定       ─→  FOLLOWERS_ONLY なイベントに参加できる
```

### Member.type の扱い

- `Member.type` は **@deprecated** — Supabase RLS ポリシーが依存するため DB には残存
- 新規コードで `type`（DANKA/GOEN）を**参照・分岐してはいけない**
- 新規ユーザー登録はすべて `GOEN` で固定

### フォロー（MemberFavoriteTemple）

誰でも複数の寺院をフォロー可能。フォロワー限定コンテンツは無課金。

---

## 機能詳細

### イベント

- `EventType`: `GROUP`（グループ開催）/ `BOOKING`（個別予約型）— UI表示切り替えのみ
- イベント複製ボタン: 定例イベント（毎月の坐禅会など）を手軽に再作成
- `EventVisibility`: `PUBLIC`（誰でも）/ `FOLLOWERS_ONLY`（フォロワー限定）
- フォロワー限定イベントを非フォロー状態で踏むとフォロー促進画面に遷移

### 寺院検索

`/api/temples` クエリパラメータ:
- `?q=テキスト` — 名称・住所・説明の全文検索
- `?denomination=宗派` — 宗派絞り込み
- `?prefecture=都道府県` — 都道府県絞り込み

### 決済設定

`/admin/settings` 内の「決済設定」セクションから Stripe Connect オンボーディングを起動。
`Temple.onlinePaymentEnabled` が false の場合はイベント決済が使えない。

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
`logActivity()` は `await` しない（メイン処理を止めない）:
```typescript
logActivity({ ... }); // awaitしない
```

### 認証・テナント確認
- 利用者画面: `getAuthUser()` → MEMBER確認
- 管理画面: `requireAdminOrStaff()` → 認証確認
- 全クエリに `templeId` スコープを必ず付ける

### 新機能追加時のチェックリスト
1. `templeId` でデータをスコープしているか
2. `FOLLOWERS_ONLY` ゲートが必要か（フォロー確認）
3. フォロー中の寺院も対象に含めるべきか（`MemberFavoriteTemple`）

### stale state 対策
タブ切り替え・年度切り替えを持つClientコンポーネントには `key={year}` 等を付けて再マウントを強制する。

### 日本会計年度
4月始まり → 1〜3月は前年度扱い:
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

---

## 廃止済み（コードに書かない）

以下は削除済みの概念。コードに追加しないこと:

- `Member.type` 参照による DANKA/GOEN 分岐 — v2では使用禁止
- `Member.stage` / `MemberStage` enum — ステージ管理
- 仏事系: DeceasedPerson / Reservation / AnnualEvent / GojikaiRule / GojikaiPayment / Ofuse
- 課金系: MembershipPlan / MemberSubscription / Donation / MembershipType / Membership
- コンテンツ系: BlogPost / BlogLike
- 運営支援: MemberNote / MemberChangeRequest / OcrRequest / OnboardingPack / AnalyticsSnapshot
- LINE自動化: LineStepSequence / LineStepQueue
- 「ご縁さん」「檀家」「メンバーシップ」「法要予約」「過去帳」「護持会費」「お布施」「ブログ」 — UIに出してはいけない
