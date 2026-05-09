# Phase 31a-fix-3 Notes

## Summary

Most of the work for this phase was already completed correctly in Phase 31a-fix-2.
The only change made was aligning `shared/BottomNav.tsx` to v2 design tokens.

---

## 順序1: font-serif 適用確認

`src/app/(app)/app/page.tsx` を確認。以下はすべて Phase 31a-fix-2 時点で適用済み:

| 要素 | font |
|-----|------|
| ヘッダー「てらログ」ラベル | font-serif ✅ |
| ヘッダー「{authUser.name}」 | font-serif ✅ |
| ヘッダー仏教的一言 subMessage | font-serif ✅ |
| セクション見出し（SectionHeaderLink） | font-serif ✅ |
| イベントカード タイトル | font-serif ✅ |
| イベントカード 寺院名・カテゴリ | font-serif ✅ |
| 日付・時刻 | font-sans ✅（変更なし） |
| 参加予定ラベル | font-serif ✅ |
| 寺院カード 寺院名・宗派 | font-serif ✅ |
| お寺の声 タイトル・寺院名 | font-serif ✅ |
| 学びの記事 カテゴリ・タイトル | font-serif ✅ |
| 通知バッジ数字 | font-sans（Tailwindデフォルト）✅ |
| FAB「記録」ラベル | font-serif ✅ |

変更なし。

---

## 順序2: ハードコード色確認

確認対象ファイルに hex / rgb / rgba の inline style は存在しない:

| ファイル | inline hex | 結果 |
|---------|-----------|------|
| page.tsx | なし（`var(--color-border-thin)` のみ） | ✅ |
| FloatingActionButton.tsx | なし | ✅ |
| layout.tsx | なし（`var(--color-border)` のみ） | ✅ |

`bg-rose-500`（通知バッジ）は Tailwind クラスのため許容範囲。

---

## 変更箇所: shared/BottomNav.tsx

Phase 31a-fix-2 で 4タブ化された `shared/BottomNav.tsx` が stone/amber 系 Tailwind クラスを使用していたため、v2 トークンに統一。

| Before | After |
|--------|-------|
| `bg-white/95 backdrop-blur-sm border-t border-stone-100 shadow-[0_-1px_12px_rgba(0,0,0,0.06)]` | `bg-paper` + `style={{ borderTop: "0.5px solid var(--color-border)" }}` |
| アクティブ: `text-amber-700 bg-amber-700`（インジケーター） | `text-ink bg-ink` |
| 非アクティブ: `text-stone-400` | `text-ink-tertiary` |
| ラベル: `text-[10px] font-medium` | `font-serif text-[10px] tracking-section font-light` |

---

## 順序3: レスポンシブ確認

CSS 構造上の問題なし:
- `max-w-lg mx-auto` がコンテンツを中央寄せ（375px〜1024px）
- FAB の `right-5 fixed` はすべての幅で適切に配置
- BottomNav の `flex` + `flex-1` で等幅4タブ

---

## 順序4: SUB_MESSAGES 確認

5件すべて実装済み:
1. 「今日も一日、丁寧に。」✅
2. 「呼吸を整えて、はじめましょう。」✅
3. 「いまここに、ありますか。」✅
4. 「小さな気づきを、大切に。」✅
5. 「ご縁に感謝して。」✅

`dayOfYear % 5` で日付ベースの決定論的選択。

---

## Build status

120 pages, all passing.
