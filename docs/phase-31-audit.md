# Phase 31 — v1 コード棚卸し監査レポート

> 調査日: 2026-05-09  
> 対象: `src/` 以下のすべての `.ts` / `.tsx` ファイル（`node_modules` / `src/generated` 除く）  
> 方針: **コード変更なし**。削除・改修・保留の判断のみ記録する。

---

## 調査 1：ハードコード色

### 概要

`style={{ ... }}` 内に直接 hex コードを記述している箇所を調査した。

- OG ルート（`/api/og/**`）は Satori が CSS 変数を解釈できないため hardcode が必須 → **対象外**
- `#06C755`（LINE ブランドカラー）・Google OAuth SVG 色 → **正当な使用**

### 改修候補（約 40 件）

OG ルート以外で繰り返し出現するパターン。CSS 変数への置き換えが望ましい。

| 色コード | 意味 | 置き換え候補 |
|---------|------|------------|
| `#E5E5E5` | 区切り線（濃い） | `var(--border)` |
| `#F0F0F0` | 区切り線（薄い） | `var(--border-thin)` ※要追加 |
| `#1A1A1A` | テキスト主色 | `var(--color-text-primary)` |

**主な出現ファイル（抜粋）：**

```
src/app/(app)/app/journal/JournalListClient.tsx        ×2
src/app/(app)/app/journal/[id]/JournalEditToggle.tsx   ×2
src/app/(app)/app/journal/[id]/page.tsx                ×1
src/app/(app)/app/journal/JournalFormClient.tsx        ×2
src/app/(app)/app/posts/[id]/page.tsx                  ×1
src/app/(app)/app/posts/page.tsx                       ×1
src/app/(app)/app/articles/page.tsx                    ×1
src/app/(app)/app/articles/[slug]/page.tsx             ×2
src/app/(app)/app/temples/map/TempleMapClient.tsx      ×2
src/app/(app)/app/temples/map/page.tsx                 ×1
src/app/(app)/app/my/MonthlyShareButton.tsx            ×1
src/app/(app)/app/my/page.tsx                          ×3
src/app/(admin)/admin/posts/PostFormClient.tsx         ×3
src/app/(admin)/admin/posts/page.tsx                   ×2
src/app/(admin)/admin/articles/page.tsx                ×2
src/app/(admin)/admin/articles/ArticleFormClient.tsx   ×2
src/components/teralog/BottomSheet.tsx                 ×1
src/components/teralog/PostCard.tsx                    ×1
src/components/teralog/ArticleRenderer.tsx             ×3
src/components/teralog/BottomNav.tsx                   ×1
src/components/teralog/QuoteBlock.tsx                  ×1
src/components/teralog/Sidebar.tsx                     ×5
```

### 保留（変更不要）

- `#06C755` — LINE ブランドカラー（temples/[id], MypageClient, LineSettingsClient）
- Google OAuth SVG 内の `#4285F4`, `#EA4335` など（LoginForm.tsx）
- `/api/og/**` 内の全ハードコード色（Satori 制約上必須）

---

## 調査 2：共通コンポーネントの使用ギャップ

### 概要

v2 では `src/components/teralog/` に共通コンポーネントが整備されている。  
管理画面・利用者画面での使用状況を確認した。

### 保留（v2 設計上の意図的な差異）

管理画面（`/admin`）は teralog デザイントークンではなく Tailwind デフォルト（`stone` / `amber`）を使用している。  
これは v2 でも意図的な設計差異（管理者向け ≠ ユーザー向けデザイン）であり、統一の必要はない。

**該当ファイル数：48 ファイル**（`src/app/(admin)/` 全体）

### 改修候補（利用者画面 — 重要度高）

利用者画面の以下のファイルは `font-serif` を使用しておらず、v2 デザインに沿っていない可能性がある。  
イベント・お知らせ・マイページ周辺が中心。

```
src/app/(app)/app/events/page.tsx
src/app/(app)/app/events/[id]/page.tsx
src/app/(app)/app/events/[id]/apply/ApplyClient.tsx
src/app/(app)/app/events/[id]/CancelButton.tsx
src/app/(app)/app/events/my/page.tsx
src/app/(app)/app/news/NewsClient.tsx
src/app/(app)/app/news/[id]/page.tsx
src/app/(app)/app/calendar/CalendarClient.tsx
src/app/(app)/app/mypage/MypageClient.tsx
src/app/(app)/app/mypage/profile/ProfileEditClient.tsx
src/app/(app)/app/mypage/line/LineSettingsClient.tsx
src/app/(app)/app/mypage/notifications/NotificationsClient.tsx
src/app/(app)/app/temples/[id]/page.tsx
src/app/(app)/app/temples/NearbyTemplesClient.tsx
src/app/(app)/app/page.tsx  ← ホーム画面
```

> 注：`font-sans` の使用自体は OK（UI 要素・補助テキスト向け）。問題は本文系テキストが `font-serif` ではなくデフォルト sans になっているケース。

---

## 調査 3：孤立ファイル（インポート元なし）

### 削除候補

| ファイル | 理由 |
|---------|------|
| `src/lib/constants/denominations.ts` | インポートしているファイルが 0 件。`SetupClient` / `NewTempleClient` / テンプル系ページがそれぞれ独自にインライン `DENOMINATIONS` 配列を定義している。 |

### 保留

| ファイル | 理由 |
|---------|------|
| `src/lib/eventCapacity.ts` | `src/__tests__/lib/eventCapacity.test.ts` のみが参照。本番コードには未使用だが、テストを壊すためそのまま保留。テストごと削除するなら要確認。 |
| `src/lib/journal/excerpt.ts` | 実際には `JournalEditToggle.tsx` と `api/og/journal/[id]/route.tsx` から参照されている。孤立検出スクリプトの誤検出。 |

---

## 調査 4：削除済みキーワードの残存

### 削除候補 — DANKA / GOEN 型参照

CLAUDE.md の v2 方針「`Member.type` を新規コードで参照・分岐しない」に違反している箇所。

| ファイル | 行 | 内容 |
|---------|-----|------|
| `src/app/api/setup/route.ts` | 69 | `type: "DANKA"` — 初回セットアップ時のデフォルト値 |
| `src/app/api/superadmin/temples/route.ts` | 76 | `type: "DANKA"` — スーパー管理者によるテンプル作成時 |
| `src/app/api/members/route.ts` | 63 | `if (!["DANKA", "GOEN"].includes(type))` — バリデーション |
| `src/app/api/members/import/route.ts` | 49–50, 96 | CSV インポートでの型バリデーション・割り当て |
| `src/app/(admin)/admin/members/import/ImportClient.tsx` | 76, 81 | UI テキスト「DANKA または GOEN」・CSV サンプルデータ |

**改修方針：**
- `api/setup` / `api/superadmin/temples` → `type: "GOEN"` 固定に変更
- `api/members` バリデーション → type フィールド自体を無視するか `GOEN` 固定に
- `api/members/import` → type 列を無視 or `GOEN` 固定
- `ImportClient.tsx` → UI テキストと CSV サンプルから DANKA/GOEN 表記を削除

### 削除候補 — 法要テキスト（LINE メッセージ）

| ファイル | 行 | 内容 |
|---------|-----|------|
| `src/app/api/line/webhook/route.ts` | 44 | LINE 連携ウェルカムメッセージに「法要・イベントのご案内」 |
| `src/app/api/webhooks/line/route.ts` | 85 | LINE 連携完了メッセージに「法要・イベントのお知らせ」 |

**改修方針：** 「法要・」を削除し「イベントのご案内」のみに修正。

### 保留 — placeholder テキスト

| ファイル | 行 | 内容 |
|---------|-----|------|
| `src/app/(admin)/admin/announcements/AnnouncementFormClient.tsx` | 100 | `placeholder="例：お盆法要のご案内"` |

UI の placeholder は検索にかからないため、ユーザーへの表示上の問題は低い。ただし v2 方針に照らせば「法要予約」系語句は避けるべきで、次回改修時に「例：お盆の行事のご案内」等に変更推奨。

### 保留 — テストコード

| ファイル | 行 | 内容 |
|---------|-----|------|
| `src/__tests__/hooks/useAuth.test.ts` | 84, 103 | `isDanka` / `isGoen` のテストケース説明文 |

テストの説明文であり UI に出ない。テスト削除・リネームは別フェーズで検討。

---

## 調査 5：Tailwind v4 の `@apply` 残存

### 概要

Tailwind v4 では `@apply` の使用が非推奨（`@layer` 内での制限あり）。  
`src/app/globals.css` に 3 箇所残存。

### 改修候補

```css
/* globals.css:147 */
@apply border-border outline-ring/50;

/* globals.css:150 */
@apply bg-background text-foreground;

/* globals.css:155 */
@apply font-sans;
```

これらは `@layer base` ブロック内に存在し、全体のデフォルトスタイルを設定している。  
Tailwind v4 のネイティブ CSS 構文に置き換え推奨：

```css
/* 例：置き換え後 */
*, *::before, *::after {
  border-color: var(--color-border);
  outline-color: color-mix(in srgb, var(--color-ring) 50%, transparent);
}
body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}
```

> ビルドエラーや表示崩れが発生していなければ緊急度は低いが、Tailwind v4 移行完了のために対処推奨。

---

## 調査 6：Noto Serif JP 適用ギャップ

### 概要

v2 デザインでは `font-serif`（= Noto Serif JP）を本文・ラベル系に使用する方針。  
`font-serif` が含まれないファイルを調査した。

### 保留 — 管理画面（意図的差異）

管理画面（`src/app/(admin)/`）は 48 ファイルすべてが `font-serif` なし。  
管理者向けには Tailwind デフォルト（`font-sans`）で統一する v2 設計方針のため変更不要。

### 改修候補 — 利用者画面（優先度高）

以下のファイルはユーザーが直接目にする画面だが `font-serif` が未適用：

**イベント系（5 ファイル）**
```
src/app/(app)/app/events/page.tsx
src/app/(app)/app/events/[id]/page.tsx
src/app/(app)/app/events/[id]/apply/ApplyClient.tsx
src/app/(app)/app/events/[id]/CancelButton.tsx
src/app/(app)/app/events/my/page.tsx
```

**お知らせ系（3 ファイル）**
```
src/app/(app)/app/news/NewsClient.tsx
src/app/(app)/app/news/[id]/page.tsx
src/app/(app)/app/news/page.tsx
```

**マイページ系（4 ファイル）**
```
src/app/(app)/app/mypage/MypageClient.tsx
src/app/(app)/app/mypage/profile/ProfileEditClient.tsx
src/app/(app)/app/mypage/line/LineSettingsClient.tsx
src/app/(app)/app/mypage/notifications/NotificationsClient.tsx
```

**寺院系（2 ファイル）**
```
src/app/(app)/app/temples/[id]/page.tsx
src/app/(app)/app/temples/NearbyTemplesClient.tsx
```

**その他（3 ファイル）**
```
src/app/(app)/app/page.tsx           ← ホーム画面
src/app/(app)/app/calendar/CalendarClient.tsx
src/app/(app)/app/events/[id]/feedback/FeedbackClient.tsx
```

> `font-sans` 自体は補助テキスト（時刻・数値・タグ等）に使うため全削除ではなく、  
> 見出し・本文・ラベル系を `font-serif` に修正する対応を推奨。

---

## サマリー

| 調査項目 | 削除候補 | 改修候補 | 保留 |
|---------|---------|---------|------|
| 1. ハードコード色 | — | 約 40 件（inline style → CSS 変数） | OG ルート・ブランドカラー |
| 2. 共通コンポーネント使用ギャップ | — | 利用者画面 15 ファイル | 管理画面 48 ファイル（意図的差異） |
| 3. 孤立ファイル | `lib/constants/denominations.ts`（1 件） | — | `eventCapacity.ts`（テスト依存） |
| 4. 削除済みキーワード残存 | DANKA/GOEN（5 ファイル）・法要テキスト（2 ファイル） | — | placeholder（1 件）・テスト（1 件） |
| 5. `@apply` 残存 | — | `globals.css` 3 行 | — |
| 6. Noto Serif JP 適用ギャップ | — | 利用者画面 17 ファイル | 管理画面 48 ファイル（意図的差異） |
