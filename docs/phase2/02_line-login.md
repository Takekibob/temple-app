# 設計書 Phase2-02｜LINEログイン有効化

## 背景・課題

- LoginForm に LINE ログインボタンがあるが「準備中」で無効化中
- コード（`getLineLoginUrl`）は実装済み
- Supabase 側の LINE provider 設定が必要

---

## 対応内容

### コード変更
- `LoginForm.tsx` の LINE ボタンを有効化（`disabled` 削除、グレーアウト解除）
- `oauthPending === "line"` のローディング表示を実装済みコードに接続

### Supabase 設定（手順書）
1. LINE Developers でアプリ作成
2. Channel ID / Channel Secret を取得
3. Supabase Dashboard → Authentication → Providers → LINE を有効化
4. コールバック URL を LINE Developers に登録

---

## ファイル変更

| ファイル | 変更内容 |
|---|---|
| `src/app/auth/login/LoginForm.tsx` | LINE ボタンの `disabled` を削除、onClick を接続 |
