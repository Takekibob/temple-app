# Phase 31b-1 Notes（2026-05-10）

管理画面サイドバーの再設計 + v2 tone 化。future-phases.md 作成。

## 関連ファイル一覧（順序1調査結果）

| ファイル | 役割 | 変更 |
|---------|-----|------|
| `src/components/admin/Sidebar.tsx` | **実際に使われているサイドバー** | Yes（全面書き換え）|
| `src/components/teralog/Sidebar.tsx` | 孤児ファイル（import 元なし） | 削除 |
| `src/app/(admin)/layout.tsx` | Admin レイアウト | Yes（bg-stone-50 → bg-paper-soft）|

## ファイル二重存在の経緯

- `src/components/admin/Sidebar.tsx`: `(admin)/layout.tsx` が `@/components/admin/Sidebar` で import → 現役
- `src/components/teralog/Sidebar.tsx`: import 元なし → 孤児（Phase 31b-1 で削除済み）

## 新しいサイドバー構成

```
[ヘッダー]
  [お寺アバター] てらログ 管理 / {お寺名}

[ナビゲーション]
  きょうの動き → /admin（最上位、単独、グループ外）

  集いを企画する（見出し、クリック不可）
    集い一覧 → /admin/events
    新しい集いを作る → /admin/events/new（exactMatch）

  発信する（見出し、クリック不可）
    お寺の声 → /admin/posts
    お知らせを送る → /admin/announcements
    学びの記事 → /admin/articles

  フォロワー（見出し、クリック不可）
    メンバー一覧 → /admin/members

  ──────────────（区切り線）

  LINE配信（自動化） → /admin/line（adminOnly）
  お寺の設定 → /admin/settings（adminOnly）
  スタッフ管理 → /admin/staff（adminOnly）
  操作ログ → /admin/logs

[フッター]
  {ユーザー名}
  利用者画面  ログアウト
```

## 採用アイコン一覧

| 項目 | アイコン |
|-----|---------|
| きょうの動き | `LayoutDashboard` |
| 集い一覧 | `CalendarDays` |
| 新しい集いを作る | `CalendarPlus` |
| お寺の声 | `Megaphone` |
| お知らせを送る | `Bell` |
| 学びの記事 | `BookOpen` |
| メンバー一覧 | `Users` |
| LINE配信（自動化） | `Send` |
| お寺の設定 | `Settings` |
| スタッフ管理 | `UserCog` |
| 操作ログ | `History` |
| 利用者画面（フッター） | `Eye` |
| ログアウト（フッター） | `LogOut` |

## LINE メニュー扱いの判断：判断 A（1項目のみ表示）

**根拠**:
- `/admin/line/` 配下に `page.tsx`、`messages/`、`sequences/` の3ページが存在
- `LineStepSequence`/`LineStepQueue` は廃止済みモデル（v2 スコープ外）
- `messages/`、`sequences/` は廃止予定モデルに依存、将来統合・削除予定
- → サイドバーには `LINE配信（自動化）` として `/admin/line` への1項目のみ掲載
- `messages/`、`sequences/` ページの要否は Phase 31b-2-3 で判断（本フェーズではページ変更なし）

## アクティブ判定ロジック

- `/admin`（きょうの動き）: `exactMatch: true` → `pathname === "/admin"` のみ
- `/admin/events/new`（新しい集いを作る）: `exactMatch: true` → exact match
- `/admin/events`（集い一覧）: `excludePath: "/admin/events/new"` → new以外の全 /admin/events/* でアクティブ
- その他: `pathname.startsWith(href)`

## 順序5 バナー調査結果

`(admin)/layout.tsx` にバナー・通知バー等の共通要素なし。v1 トーン残存なし（`bg-stone-50` → `bg-paper-soft` 修正済み）。修正不要。

## コミット

1. `b79e239` — Phase 31b-1: redesign admin sidebar to v2 with business flow grouping（孤児削除含む）
2. （後続）future-phases.md + phase-31b-1-notes.md 作成

