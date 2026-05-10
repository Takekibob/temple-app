# Phase 31a-fix-2.5 Notes（2026-05-10）

集い一覧とお寺詳細のv2トーン統一。

## 関連ファイル一覧（順序1調査結果）

### /app/events
| ファイル | 役割 | 変更 |
|---------|-----|------|
| `src/app/(app)/app/events/page.tsx` | メイン一覧 Server Component | Yes（フル更新） |
| `src/lib/eventCategories.ts` | カテゴリアイコン定義 | Yes（emoji→Lucide） |
| `src/components/app/SearchBar.tsx` | 検索バー Client Component | Yes（配色のみ） |
| `src/app/(app)/app/events/[id]/page.tsx` | 個別詳細（スコープ外） | 最小限（型修正のみ） |
| `src/app/(app)/app/events/my/page.tsx` | 申込済み一覧（スコープ外） | 最小限（型修正のみ） |

### /app/temples/[id]
| ファイル | 役割 | 変更 |
|---------|-----|------|
| `src/app/(app)/app/temples/[id]/page.tsx` | お寺詳細 Server Component | Yes（フル更新） |
| `src/app/(app)/app/temples/[id]/FollowButton.tsx` | フォローボタン Client Component | Yes（アイコン・配色） |

## アイコン選定結果

| カテゴリ | 絵文字 | 選定アイコン |
|---------|------|------------|
| 坐禅 ZAZEN | 🧘 | `Circle` |
| 写経 SHAKYO | ✍️ | `Feather` |
| ヨガ YOGA | 🌿 | `Leaf` |
| マインドフルネス MINDFULNESS | 🕯️ | `Flame` |
| 仏事講座 LECTURE | 📖 | `GraduationCap` |
| 季節行事 SEASONAL | 🌸 | `Flower2` |
| その他 OTHER | 🎋 | `MoreHorizontal` |
| お寺ロゴfallback | 🏯 | 寺名1文字（font-serif） |

## 実装上の判断記録

### getCategoryIcon() の型変更に伴うスコープ外更新
`getCategoryIcon()` の返り値を `string`（絵文字）→ `LucideIcon`（Reactコンポーネント）に変更したため、
呼び出し元全ファイルが TypeScript エラーになる。

対象外ファイル（`events/[id]` と `events/my`）には `CategoryLabel` ヘルパーコンポーネントを追加し、
最小限の変更でビルドを通過させた。スタイル変更は行っていない。

### 保留した色
- LINE ブランドカラー: `#06C755`（仕様書の保留対象）
- Instagram: `bg-gradient-to-br from-purple-500 to-pink-500`（SNSブランドカラー）
- YouTube: `bg-red-600`（SNSブランドカラー）

Instagram と YouTube は仕様書に明記なしだが、ブランド識別性維持のため保留。

### FollowButton: Heart → Check
仕様書通り Heart アイコン（フォロー中状態）を Check に変更。
未フォロー状態はアイコンなし（シンプル化）。

### 「イベント」→「集い」変更箇所
- `/app/events` h1: 「イベント」→「集い」
- SearchBar placeholder: 「イベントを検索…」→「集いを検索…」
- `/app/events` 空状態: 「開催予定のイベントはありません」→「開催予定の集いはありません」
- `/app/events` フォロー0件バナー本文: 「イベント」→「集い」
- `/app/events` フォロー中セクション: 「フォロー中のお寺のイベント」→「フォロー中のお寺の集い」
- `/app/events` 全体セクション: 「すべてのお寺のイベント」→「すべての集い」
- `/app/temples/[id]` セクション見出し: 「開催予定のイベント」→「開催予定の集い」
- `/app/temples/[id]` 空状態: 「開催予定のイベントはありません」→「開催予定の集いはありません」
- `/app/temples/[id]` 戻るリンク: 「イベント一覧」→「集い一覧」

## コミット

1. `b20a08f` — Phase 31a-fix-2.5: unify /app/events to v2 tone
2. `011aedb` — Phase 31a-fix-2.5: unify /app/temples/[id] to v2 tone
