# 設計書 Phase2-03｜トライアル終了通知（Cron）

## 背景・課題

- トライアル期間が終了しても自動で何も起きない
- 課金への誘導がなく、無料のまま使われ続けるリスク

---

## 要件

| タイミング | 内容 |
|---|---|
| 終了7日前 | 管理者メールに「残り7日」通知 |
| 終了当日 | 管理者メールに「今日で終了」通知 |
| 終了後（翌日） | planStatus を `TRIAL` のまま機能継続（強制停止はしない。Stripe 契約を促すのみ） |

---

## 実装方針

- 既存の `/api/cron/reminders` に習い、`/api/cron/trial-expiry` を新設
- Supabase Auth の管理者メール（User テーブルの ADMIN ユーザー）に送信
- メール送信は Supabase の `auth.admin.generateLink()` + `fetch` でメール送信
  → ただし Supabase はカスタムメール未対応のため、**Resend** を使用
- Vercel Cron で毎日 09:00 JST に実行

---

## メール文面

### 残り7日
```
件名：【てらログ】トライアル期間終了まで残り7日です

〇〇寺 ご担当者様

てらログをご利用いただきありがとうございます。
トライアル期間終了まで残り7日となりました（終了日：XXXX年XX月XX日）。

引き続きご利用いただくには、スタンダードプランのご契約をお願いします。
▼ プラン契約はこちら
https://teralog.app/admin/billing

ご不明な点はお気軽にご連絡ください。
support@teralog.app

てらログ サポートチーム
```

---

## ファイル構成

```
src/app/api/cron/trial-expiry/route.ts   ← 新規
src/lib/email.ts                          ← 新規（Resend クライアント）
vercel.json                               ← cron 設定追加
```

---

## 環境変数

```
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@teralog.app
```
