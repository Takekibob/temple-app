# Phase 31a-fix-3 Notes（2026-05-10）

通知設計の実装。LINE通知頻度UI刷新・LINE友だち追加促進・ワーディング統一。

## 関連ファイル一覧（順序1調査結果）

### LINE設定（利用者）
| ファイル | 役割 | 変更 |
|---------|-----|------|
| `src/app/(app)/app/mypage/line/page.tsx` | LINE設定 Server Component | Yes（タイトル変更） |
| `src/app/(app)/app/mypage/line/LineSettingsClient.tsx` | 通知設定 Client Component | Yes（フル更新） |

### イベント申込完了
| ファイル | 役割 | 変更 |
|---------|-----|------|
| `src/app/(app)/app/events/[id]/apply/page.tsx` | 無料イベント申込 Server Component | Yes（LINE props追加）|
| `src/app/(app)/app/events/[id]/apply/ApplyClient.tsx` | 申込 Client Component | Yes（LINE促進カード） |
| `src/app/(app)/app/events/[id]/apply/success/page.tsx` | Stripe決済成功ページ | Yes（LINE促進カード） |

### 管理画面LINE（順序4調査のみ・修正なし）
| ファイル | 役割 | 変更 |
|---------|-----|------|
| `src/app/(admin)/admin/line/page.tsx` | LINE通知管理トップ | なし |
| `src/app/(admin)/admin/line/messages/page.tsx` | メッセージ一覧 | なし |
| `src/app/(admin)/admin/line/messages/new/page.tsx` | メッセージ作成 | なし |
| `src/app/(admin)/admin/line/sequences/page.tsx` | ステップ配信一覧 | なし |
| `src/app/(admin)/admin/line/sequences/new/page.tsx` | ステップ配信作成 | なし |
| `src/app/(admin)/admin/line/sequences/[id]/page.tsx` | ステップ配信編集 | なし |

### 環境変数
| ファイル | 変更 |
|---------|-----|
| `.env.example` | `LINE_ADD_FRIEND_URL=` 追記 |

## 4択ラジオ通知頻度設計

### NotifyMode ↔ DBフィールドマッピング

| モード | lineNotifyEnabled | notifyEvent | notifyAnnouncement |
|-------|------------------|-------------|-------------------|
| all | true | true | true |
| important | true | true | true（allと同値） |
| event_only | true | true | false |
| none | false | false | false |

### 既知の制約
`important` と `all` は DB上同一の値を持つため、ページリロード後は常に `all` として復元される。
仕様上「将来設定予定、現在はすべてと同じ」ため許容。

### 将来タスク（要クリーンアップ）
`/app/mypage/notifications` にも `notifyEvent` / `notifyAnnouncement` のトグルが存在する。
LINEとプッシュ通知で同一フィールドを編集しており、将来的には通知設定を一画面に統合するか、
フィールドを分離する必要がある（v2スコープ外）。

## LINE友だち追加促進（順序5）

### 実装箇所
1. **無料イベント申込完了**（`ApplyClient.tsx` の `done` state）
2. **有料イベントStripe決済完了**（`apply/success/page.tsx` の `isPaid` ブロック）

### 表示条件
- `!lineLinked && lineAddUrl` の場合のみ表示
- 既にLINE連携済みのユーザーには表示しない

### 配置
- `ApplyClient.tsx`: 完了メッセージとCTAボタンの間に挿入
- `success/page.tsx`: eventTitleと「アプリに戻るには」セクションの間に挿入

## ワーディング統一（順序3）

| 変更前 | 変更後 |
|--------|--------|
| LINE連携 | TeraLog 公式 LINE 連携 |
| LINEを連携するとイベントや行事のリマインドが届きます。 | TeraLog 公式 LINE と連携すると、参加する集いのリマインドが届きます。 |
| LINEで友達追加する | TeraLog 公式 LINE を友だち追加する |

## 順序4 管理画面LINE調査結果（Phase 31b への引き継ぎ）

6ファイル全て存在することを確認。問題ワードの調査結果:

- `admin/line/page.tsx`: `LINE通知管理` の見出しのみ、「このお寺の LINE」「Webhook」「チャネル」等の問題ワードなし
- `admin/line/messages/page.tsx`: LINE_REGISTER など内部enum値を表示するが、ユーザー向け文言に問題なし
- `admin/line/sequences/page.tsx`: ステップ配信UI、問題ワードなし
- その他ファイル: 問題ワードなし

**注意**: 管理画面の LINE 機能（ステップ配信、メッセージ配信）は v2 仕様では廃止予定（LineStepSequence / LineStepQueue は廃止済みモデル）。これらページ自体の要否は Phase 31b で判断。本フェーズでは修正なし。

## 共通コンポーネント

`src/components/teralog/LineFollowPrompt.tsx`
- `lineUserId: string | null | undefined` — 連携済みなら null を返す
- `addUrl: string | null | undefined` — 未設定なら null を返す
- v2 トーン: `bg-paper-soft` + `style border` + `#06C755` LINE ボタン

## コミット

1. `6b10787` — 順序1: LineSettingsClient 4択ラジオ + .env.example LINE_ADD_FRIEND_URL追加
2. `4dd9479` — 順序3: LINE文言を「TeraLog 公式 LINE」に統一
3. `17594e8` — 順序6-C: LineFollowPrompt 共通コンポーネント作成
4. `4cb7f7d` — 順序6-A: Stripe 申込完了画面に LINE 促進カード追加
5. `623e59e` — 順序6-B: 無料イベント申込完了処理に LINE 促進カード追加
