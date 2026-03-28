# 設計書 Phase2-05｜データエクスポートUI

## 背景・課題

- `/api/export/members`, `/api/export/events`, `/api/export/ofuse` の API は実装済み
- 管理画面にダウンロードボタンが存在しない（APIを直接叩く必要がある）

---

## 対応内容

各管理ページにCSVエクスポートボタンを追加：

| ページ | エクスポート対象 |
|---|---|
| `/admin/members` | 会員一覧 CSV |
| `/admin/events` | イベント一覧 CSV |
| `/admin/ofuse` | お布施一覧 CSV |

また `/admin/reports` に「一括エクスポート」セクションを追加。

---

## UI パターン

```
[↓ CSVダウンロード]  ← ページ右上に追加
```

- クリックで `/api/export/members` を fetch → Blob → `<a download>` でダウンロード
- ローディング中はスピナー表示

---

## ファイル変更

| ファイル | 変更内容 |
|---|---|
| `src/components/admin/ExportButton.tsx` | 新規：汎用エクスポートボタンコンポーネント |
| 各管理ページ | ExportButton を追加 |
