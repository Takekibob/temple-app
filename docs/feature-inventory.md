# TeraLog 機能棚卸し

> 調査日: 2026-05-10
> 調査者: Claude AI (read-only analysis)
> LINE方針: テラログ公式LINE一本化（お寺別LINE廃止予定）
> プロジェクト: てらログ v2.2+

---

## セクション1：管理者向け機能一覧

### 管理画面ナビゲーション構造

**テラログスタンダード版（Sidebar.tsx）:**
- グループ1: ダッシュボード
- グループ2（会員）: メンバー一覧
- グループ3（イベント・お知らせ）: イベント一覧、お知らせ、お寺の声、学びの記事、LINE配信
- グループ4（設定）: お寺の設定、スタッフ管理

**テラログカスタム版（Sidebar.tsx - 別UI）:**
- メイン: きょうの様子、集いをひらく、お知らせを送る、フォロワー、お寺の情報
- ボトム: LINE設定、スタッフ管理

| 画面パス | 目的 | 主要機能 | CRUD | 関連API | 関連モデル | LINE関連 | 備考 |
|---------|------|--------|------|---------|-----------|----------|------|
| /admin | ダッシュボード | KPI表示（メンバー/フォロワー/今月申込）、公開中イベント一覧、6ヶ月折れ線グラフ | R | - | Member, MemberFavoriteTemple, EventParticipation, Event | なし | graphqlフック対応 |
| /admin/events | イベント管理 | リスト表示、ステータス別フィルタ（全て/下書き/公開中/募集終了/完了）、CSV出力 | CRUD | /api/export/events | Event | なし | 定員・参加人数表示 |
| /admin/events/new | イベント作成 | 新規作成フォーム | C | /api/events | Event | なし | 推測：カテゴリ・日時・定員設定 |
| /admin/events/[id]/edit | イベント編集 | 編集フォーム | U | /api/events/[id] | Event | なし | 推測：詳細・キャンセル機能 |
| /admin/events/[id]/participants | イベント参加者管理 | 参加者リスト、ステータス管理、手動追加、イベント複製 | RU | /api/events/[id]/participants | EventParticipation, Member | なし | 支払状況・参加人数表示 |
| /admin/events/[id]/analytics | イベント個別分析 | 推測：参加者分析、登録推移 | R | 推測：/api/events/[id]/analytics | EventParticipation | なし | 推測：グラフ表示 |
| /admin/events/analytics | 全体イベント分析 | 推測：全イベント分析 | R | 推測：/api/analytics/events | Event | なし | 推測：複数月比較 |
| /admin/announcements | お知らせ管理 | リスト表示、公開/下書き分類、新規作成 | CRUD | /api/announcements | Announcement | 推測：LINE配信予定 | フォロワー全員向け |
| /admin/announcements/new | お知らせ作成 | 新規作成フォーム | C | /api/announcements | Announcement | 推測：LINE連携 | 推測：公開日時設定 |
| /admin/announcements/[id]/edit | お知らせ編集 | 編集フォーム | U | /api/announcements/[id] | Announcement | 推測：LINE連携 | 推測：公開切り替え |
| /admin/members | フォロワー管理 | リスト表示、検索・タグフィルタ、CSV出力、一括登録 | CRUD | /api/members, /api/export/members | Member | なし | 優先タグ・備考表示 |
| /admin/members/[id] | フォロワー詳細 | 推測：個別情報表示・編集 | RU | /api/members/[id] | Member | 推測：LINE状態表示 | 推測：連絡履歴 |
| /admin/members/[id]/edit | フォロワー編集 | 推測：情報編集フォーム | U | /api/members/[id] | Member | なし | 推測：タグ・備考更新 |
| /admin/members/[id]/family-tree | ファミリーツリー | 推測：代理関係表示 | R | /api/members/[id]/family | Member | なし | 推測：代理人設定表示 |
| /admin/members/import | 会員一括登録 | CSVインポート UI | C | /api/members/import | Member | なし | DANKA/GOEN廃止予定 |
| /admin/posts | お寺の声管理 | リスト表示、写真付き | CRUD | /api/posts | TemplePost | なし | 最新50件取得 |
| /admin/posts/new | お寺の声作成 | 新規作成フォーム | C | /api/posts | TemplePost | なし | 推測：写真アップロード |
| /admin/posts/[id]/edit | お寺の声編集 | 編集フォーム | U | /api/posts/[id] | TemplePost | なし | 推測：公開切り替え |
| /admin/articles | 学びの記事管理 | リスト表示、カテゴリ別表示 | CRUD | /api/articles | Article | なし | SuperAdmin向け |
| /admin/articles/new | 学びの記事作成 | 新規作成フォーム | C | /api/articles | Article | なし | 推測：カテゴリ・公開日設定 |
| /admin/articles/[id]/edit | 学びの記事編集 | 編集フォーム | U | /api/articles/[id] | Article | なし | 推測：ステータス管理 |
| /admin/line | LINE通知管理 | ダッシュボード、配信数/種別表示、最近の配信 | R | /api/line/messages | LineMessage | **LINE中心** | テラログ公式LINE向け |
| /admin/line/messages | LINE配信履歴 | 配信リスト、ステータス別分類 | R | /api/line/messages | LineMessage | **LINE中心** | 一斉/個別/リマインダー |
| /admin/line/messages/new | LINE配信作成 | 新規配信フォーム | C | /api/line/messages | LineMessage | **LINE中心** | 推測：日時予約 |
| /admin/line/sequences | ステップ配信設定 | シーケンス一覧、有効/無効トグル | RU | /api/line/sequences | LineSequence | **LINE中心** | イベント初参加/LINE登録トリガー |
| /admin/line/sequences/new | ステップ配信作成 | 新規シーケンスフォーム | C | /api/line/sequences | LineSequence | **LINE中心** | 推測：複数ステップ設定 |
| /admin/line/sequences/[id] | ステップ配信編集 | 編集フォーム | U | /api/line/sequences/[id] | LineSequence | **LINE中心** | 推測：ステップ管理 |
| /admin/settings | お寺の設定 | 寺院情報編集（名前/住所/ロゴ等）、SNS URL | U | /api/settings | Temple | なし | AdminOnly |
| /admin/staff | スタッフ管理 | スタッフリスト、役割（住職/スタッフ）設定 | CRU | /api/staff | User | なし | AdminOnly |
| /admin/logs | 操作ログ | 監査ログ表示、操作/対象別フィルタ | R | - | ActivityLog | なし | 全テンプル共通 |

---

## セクション2：利用者向け機能一覧

| 画面パス | 目的 | 主要機能 | CRUD | 関連API | 関連モデル | LINE関連 | 備考 |
|---------|------|--------|------|---------|-----------|----------|------|
| /app | ホーム | セッティングメッセージ、参加予定/フォロー中未参加イベント、お寺・投稿・記事推奨 | R | - | Event, TemplePost, Article, MemberFavoriteTemple | なし | 日替わりメッセージ |
| /app/events | イベント一覧 | フォロー中優先表示、カテゴリフィルタ、検索 | R | /api/events | Event, MemberFavoriteTemple | なし | 申込済みタブ併設 |
| /app/events/[id] | イベント詳細 | 詳細表示、参加・キャンセル・感想投稿 | RU | /api/events/[id], /api/events/[id]/apply | Event, EventParticipation, EventReflection | **リマインダー送信** | LINE通知対象 |
| /app/events/[id]/apply | イベント申込 | 申込フォーム、支払い情報（あれば）| C | /api/events/[id]/apply | EventParticipation | **テラログLINEで通知** | 確認メール送信推測 |
| /app/events/[id]/apply/success | 申込完了 | 完了メッセージ、QRコード等 | R | - | EventParticipation | 推測：LINE送信済み | 推測：カレンダー追加 |
| /app/events/[id]/feedback | イベント感想投稿 | スコア（1-5）、コメント入力 | C | /api/events/[id]/feedback | EventReflection | なし | イベント後のみ |
| /app/events/my | 申込済みイベント | 申込・確定・キャンセル待ち・参加済み別表示 | R | /api/events/my | EventParticipation | なし | ステータス分類 |
| /app/temples | お寺検索（リスト） | リスト/地図切替、宗派フィルタ、フォロー中優先 | R | /api/temples | Temple, MemberFavoriteTemple | なし | フォロー状態表示 |
| /app/temples/[id] | お寺詳細 | 情報表示、イベント一覧、参拝記録、フォロー切り替え | RU | /api/temples/[id], /api/temples/[id]/follow | Temple, TempleVisit | 推測：お知らせ購読 | 公式サイト遷移 |
| /app/temples/[id]/visit | 参拝記録 | 参拝日時・感想入力 | C | /api/temples/[id]/visit | TempleVisit | なし | 推測：思い出保存 |
| /app/temples/map | お寺検索（地図） | 地図表示、フォロー操作 | R | /api/temples/map | Temple, MemberFavoriteTemple | なし | 推測：GPS位置取得 |
| /app/temples/history | 参拝履歴 | 訪問したお寺のリスト | R | /api/temples/history | TempleVisit | なし | 日時・感想表示 |
| /app/temples/visit | 参拝記録一覧 | 推測：参拝記録表示 | R | /api/temples/visit | TempleVisit | なし | 推測：統計表示 |
| /app/news | お知らせ | フォロー中・登録寺院のお知らせ、既読管理 | RU | /api/announcements | Announcement, AnnouncementRead | **テラログLINEで配信** | 未読カウント表示 |
| /app/news/[id] | お知らせ詳細 | 詳細表示、既読マーク | U | /api/announcements/[id] | Announcement | なし | お寺ロゴ表示 |
| /app/journal | 日誌一覧 | 月別カレンダー、日誌リスト | R | /api/journal | Journal | なし | 瞑想・読経・修行記録 |
| /app/journal/new | 日誌作成 | テキスト/写真入力 | C | /api/journal | Journal | なし | 推測：タグ付け |
| /app/journal/[id] | 日誌詳細 | 表示・編集・削除 | RU | /api/journal/[id] | Journal | なし | 共有ボタン推測 |
| /app/posts | お寺の声 | フォロー中優先、写真表示 | R | /api/posts | TemplePost | なし | フォロー促進バナー |
| /app/posts/[id] | お寺の声詳細 | 詳細表示、写真ギャラリー | R | /api/posts/[id] | TemplePost | なし | シェア機能 |
| /app/articles | 学びの記事 | リスト表示、カテゴリフィルタ | R | /api/articles | Article | なし | 通常表示 |
| /app/articles/[slug] | 学びの記事詳細 | マークダウン表示 | R | /api/articles/[slug] | Article | なし | シェア機能 |
| /app/calendar | カレンダー | 推測：参加イベント・日誌表示 | R | /api/calendar | Event, Journal | 推測：LINE購読状態 | 推測：月表示 |
| /app/mypage | マイページ | ユーザー情報、プロフィール編集へのリンク | R | /api/mypage | User, Member | なし | LINE連携状態表示 |
| /app/mypage/profile | プロフィール編集 | 推測：名前・アバター等編集 | U | /api/mypage/profile | User, Member | なし | 推測：パスワード変更 |
| /app/mypage/line | LINE設定 | LINE連携状態、通知設定（イベント/お知らせ） | RU | /api/members/[id]/line-settings | Member | **LINE中心** | 連携コード発行・トグル |
| /app/mypage/notifications | 通知設定 | プッシュ通知設定 | RU | /api/settings/notifications | User, PushSubscription | なし | 推測：ON/OFF管理 |
| /app/my | マイページ別版 | 推測：統計・実績表示 | R | /api/my | Member | なし | 推測：月別参加数 |

---

## セクション3：管理者業務フロー

### 業務1: 新規イベント作成・公開までの流れ

- **実行者**: 住職 / 管理者
- **頻度**: 週1-3回（季節による）
- **画面遷移**: ダッシュボード → イベント管理 → イベント作成 → イベント編集 → イベント参加者管理
- **操作数**: 5画面、10操作（作成→保存→公開→確認）
- **使いやすさ**: 4/5
- **評価理由**: 直感的だが、公開前の確認画面不足
- **フロー連続性**: 連続（中断なし）

### 業務2: イベント参加者管理・確定までの流れ

- **実行者**: 住職 / スタッフ
- **頻度**: イベント開催前日・当日
- **画面遷移**: ダッシュボード → イベント一覧 → 参加者管理 → ステータス更新
- **操作数**: 4画面、15-20操作（大規模イベント）
- **使いやすさ**: 3.5/5
- **評価理由**: 手動追加・複数ステータス更新が多く、一括機能がほしい
- **フロー連続性**: 連続だが繰り返し編集多い

### 業務3: お知らせ配信（テラログLINE統合予定）

- **実行者**: 住職 / 管理者
- **頻度**: 週1-2回
- **画面遷移**: ダッシュボード → お知らせ管理 → お知らせ作成 → (推測) LINE確認 → 公開
- **操作数**: 3-4画面、8操作
- **使いやすさ**: 3/5
- **評価理由**: LINE配信状況が不透明。テラログLINE方針に向け要改善
- **フロー連続性**: 分断（LINE配信状況確認が別）

### 業務4: LINE通知配信（テラログLINE中心）

- **実行者**: 住職 / 管理者（AdminOnly）
- **頻度**: イベント前日 + 当日朝（自動）、随時配信（手動）
- **画面遷移**: ダッシュボード → LINE通知管理 → 配信作成 → スケジュール設定 → 送信
- **操作数**: 5画面、12操作
- **使いやすさ**: 4/5
- **評価理由**: UI整理良好だが、テンプレート機能がない
- **フロー連続性**: 連続（配信歴も同画面）

### 業務5: フォロワー管理・タグ付け

- **実行者**: 住職 / スタッフ
- **頻度**: 月1回まとめて、随時追加
- **画面遷移**: ダッシュボード → フォロワー管理 → 検索/フィルタ → 詳細編集
- **操作数**: 3-4画面、10-15操作（20名単位）
- **使いやすさ**: 3.5/5
- **評価理由**: 一括編集がなく手作業多い、タグの種類固定
- **フロー連続性**: 連続だが繰り返し多い

### 業務6: 会員一括インポート

- **実行者**: 住職 / 管理者（AdminOnly）
- **頻度**: 初期構築時・年1-2回
- **画面遷移**: フォロワー管理 → 一括登録 → CSV アップロード
- **操作数**: 2画面、4操作
- **使いやすさ**: 2.5/5
- **評価理由**: DANKA/GOEN型分類廃止予定。エラーハンドリング不明確
- **フロー連続性**: 単発（非連続）

### 業務7: お寺の声（ブログ）投稿

- **実行者**: 住職 / スタッフ
- **頻度**: 週1回程度（自由度高）
- **画面遷移**: ダッシュボード → お寺の声管理 → 投稿作成 → 写真アップロード → 公開
- **操作数**: 4画面、8操作
- **使いやすさ**: 4/5
- **評価理由**: フォーム単純で使いやすい
- **フロー連続性**: 連続

### 業務8: 学びの記事（管理者向けコンテンツ）管理

- **実行者**: SuperAdmin / 一部Admin
- **頻度**: 月1-2記事
- **画面遷移**: 記事管理 → 作成 → 公開
- **操作数**: 2-3画面、6操作
- **使いやすさ**: 4/5
- **評価理由**: シンプル。ただし複数寺院対応で混乱の可能性
- **フロー連続性**: 連続

### 業務9: スタッフ管理（役割設定）

- **実行者**: 住職（AdminOnly）
- **頻度**: スタッフ変動時（半年に1度程度）
- **画面遷移**: ダッシュボード → スタッフ管理 → 役割編集
- **操作数**: 2画面、6操作
- **使いやすさ**: 4/5
- **評価理由**: シンプルで明確。住職/スタッフ二項分類
- **フロー連続性**: 連続

### 業務10: 操作ログ監査

- **実行者**: 住職 / 監査者
- **頻度**: 月末・定期チェック
- **画面遷移**: ダッシュボード → 操作ログ → フィルタ → 詳細確認
- **操作数**: 2-3画面、5操作
- **使いやすさ**: 3.5/5
- **評価理由**: フィルタUIは良好だが、詳細表示が限定的
- **フロー連続性**: 連続

---

## セクション4：利用者目的別フロー

### 目的1: イベント検索・参加申込

- **実行者**: フォロワー（会員）
- **頻度**: 随時（週1-3回）
- **画面遷移**: ホーム → イベント一覧 → 詳細 → 申込 → 申込完了
- **使いやすさ**: 4.5/5
- **評価理由**: フォロー中優先表示で発見しやすい
- **テストシナリオ**: 未登録ユーザー → 登録 → イベント検索 → 申込

### 目的2: お寺フォロー・お知らせ購読

- **実行者**: フォロワー（会員）
- **頻度**: 初期1回、随時
- **画面遷移**: ホーム → お寺探す（リスト/地図） → 詳細 → フォロー操作 → ホーム（更新）
- **使いやすさ**: 4/5
- **評価理由**: フォロー後の段階的配信が見える
- **テストシナリオ**: お寺検索 → リスト/地図切替 → フォロー → ホーム確認

### 目的3: LINE連携・通知設定

- **実行者**: フォロワー（会員）
- **頻度**: 初期1回、変更時
- **画面遷移**: マイページ → LINE設定 → 連携コード発行 → LINE友達追加 → コード送信 → 設定完了
- **使いやすさ**: 3/5
- **評価理由**: 手順4ステップで明記されているが、実際のLINE操作が別ウィンドウ
- **テストシナリオ**: LINE設定 → コード生成 → LINE遷移 → テキスト送信 → 確認メッセージ待機

### 目的4: 参拝記録・日誌保存

- **実行者**: フォロワー（会員）
- **頻度**: イベント参加時 + 個人修行時
- **画面遷移**: 
  - パターンA（イベント後）: イベント詳細 → 感想投稿 → 保存
  - パターンB（個人）: マイページ → 日誌 → 作成 → 保存
- **使いやすさ**: 4/5
- **評価理由**: 位置づけが明確（イベント感想 vs 日誌）だが、画面統一が不足
- **テストシナリオ**: イベント参加 → 参加完了 → 後日感想記入 vs 日誌新規作成

### 目的5: お寺の情報・投稿閲覧

- **実行者**: フォロワー（会員）
- **頻度**: 随時（週1回程度）
- **画面遷移**: ホーム → お寺の声 → 詳細 → シェア
- **使いやすさ**: 4.5/5
- **評価理由**: フォロー中優先表示が効果的
- **テストシナリオ**: ホーム投稿確認 → クリック → 全文表示 → SNSシェア

### 目的6: 学びの記事閲覧

- **実行者**: 全ユーザー
- **頻度**: 随時（週1-2回）
- **画面遷移**: ホーム → 学びの記事 → 詳細 → シェア
- **使いやすさ**: 4/5
- **評価理由**: カテゴリフィルタはないが、推奨表示で発見可能
- **テストシナリオ**: ホーム記事表示 → 詳細 → マークダウン確認

### 目的7: お知らせ確認（未読・既読管理）

- **実行者**: フォロワー（会員）
- **頻度**: 毎日（習慣的）
- **画面遷移**: ホーム → お知らせ → 詳細 → 既読マーク
- **使いやすさ**: 3.5/5
- **評価理由**: 既読マークUIは不明確
- **テストシナリオ**: ホーム未読バッジ → お知らせ → クリック → 既読化

### 目的8: プロフィール編集・LINE設定変更

- **実行者**: フォロワー（会員）
- **頻度**: 初期設定後は稀（変更時のみ）
- **画面遷移**: マイページ → プロフィール編集 / LINE設定 → 保存
- **使いやすさ**: 3.5/5
- **評価理由**: LINE設定は複数ステップで不透明
- **テストシナリオ**: マイページ → LINE設定 → トグル → 保存確認

---

## セクション5：LINE関連機能の分類

### テーブル1: テラログLINE方針（新）に向けた機能分類

| ファイルパス | 現状の役割 | 対象機能 | 新方針での役割 | 判定 | アクション |
|-------------|----------|--------|-------------|------|-----------|
| /admin/line/page.tsx | LINE通知管理ダッシュボード | 配信数表示、最近の配信 | テラログ公式LINE向けダッシュボード | **維持・強化** | UI整理、テンプレート機能追加 |
| /admin/line/messages/page.tsx | LINE配信履歴表示 | 一斉/個別/リマインダー配信リスト | テラログ公式LINE配信履歴 | **維持** | フィルタ機能強化 |
| /admin/line/messages/new/page.tsx | LINE配信作成 | 新規配信UI | テラログ公式LINE配信作成 | **維持・改善** | 変数テンプレート追加、スケジュール改善 |
| /admin/line/sequences/page.tsx | ステップ配信設定 | 自動配信シーケンス | 推測：イベント初参加時自動配信 | **再設計** | テラログLINE統合、トリガー明確化 |
| /app/mypage/line/page.tsx | LINE連携設定画面 | 連携・通知設定 | テラログ公式LINE加友達・通知制御 | **維持・シンプル化** | 不要なお寺別LINE説明削除 |
| /app/mypage/line/LineSettingsClient.tsx | LINE連携UI | 連携コード生成、トグル設定 | テラログ公式LINE連携UI | **維持** | UI文言「テラログLINE」に統一 |
| src/app/api/line/generate-code/route.ts | 連携コード生成API | ユーザーとテラログLINEの連携 | テラログ公式LINE連携API | **維持** | エラーハンドリング強化 |
| src/app/api/line/webhook/route.ts | LINE Webhook 受信 | テキスト受信、コード検証 | テラログ公式LINEメッセージ受信 | **維持** | セキュリティ監査 |
| src/app/api/line/messages/route.ts | LINE配信API | メッセージ送信 | テラログ公式LINE配信実行 | **維持・拡張** | レート制限、リトライロジック |
| src/app/api/members/[id]/line-settings/route.ts | 会員LINE設定API | 通知設定保存 | テラログ公式LINE通知制御API | **維持** | 検証強化 |
| prisma schema: Member.lineUserId | DB: LINE ユーザーID | ユーザーとLINEの連携 | テラログ公式LINE ユーザーID | **維持** | インデックス確認 |
| prisma schema: Member.lineNotifyEnabled | DB: 通知有効フラグ | 全LINE通知制御 | テラログ公式LINE通知マスタースイッチ | **維持** | デフォルト値確認 |
| prisma schema: Member.notifyEvent/notifyAnnouncement | DB: 個別通知フラグ | イベント/お知らせ別制御 | テラログ公式LINE配信種別制御 | **維持** | デフォルト値確認 |
| prisma schema: LineMessage | DB: LINE配信履歴 | 配信管理 | テラログ公式LINE配信ログ | **維持** | レコード数監視 |

### テーブル2: 廃止対象（お寺別LINE機能）

| 機能 | 現在の実装 | 廃止理由 | 代替方法 | 期限 |
|------|---------|--------|--------|------|
| お寺別LINE公式アカウント連携 | Temple.lineOfficialUrl | テラログLINE一本化方針 | テラログ公式LINE向けお知らせ配信 | v2.3予定 |
| お寺別LINE Webhook | `/api/webhooks/line` | 不要（テラログLINE中心） | テラログLINE Webhook集約 | v2.3予定 |
| 定期的なお寺別LINE配信シーケンス | LineSequence（一部） | テラログ中心統一 | テラログLINEステップ配信で統合 | v2.3予定 |

### テーブル3: 再設計対象

| ファイルパス | 現状 | 再設計方針 | 優先度 |
|-------------|------|---------|--------|
| /admin/line/sequences | トリガー：FIRST_EVENT_ATTEND, LINE_REGISTER | 明確化：イベント初参加→前日リマインダー、当日朝リマインダー | 高 |
| /app/mypage/line/LineSettingsClient.tsx | 「お寺のLINE」説明 | 「テラログ公式LINE」に統一、お寺別LINE説明削除 | 高 |
| 管理者向けLINEテンプレート | 現在なし | イベント/お知らせ配信用テンプレート追加 | 中 |

---

## セクション6：管理画面サイドバー再設計提案

### 現状構造（Sidebar.tsx - スタンダード版）

```
ダッシュボード
    ├─ ナビ: ダッシュボード

会員
    ├─ ナビ: メンバー一覧

イベント・お知らせ
    ├─ ナビ: イベント一覧
    ├─ ナビ: お知らせ
    ├─ ナビ: お寺の声
    ├─ ナビ: 学びの記事
    └─ ナビ: LINE配信（AdminOnly）

設定
    ├─ ナビ: お寺の設定（AdminOnly）
    └─ ナビ: スタッフ管理（AdminOnly）
```

**特徴**: グループ4段階、明確な階層

### 現状構造（Sidebar.tsx - カスタム版）

```
きょうの様子
集いをひらく
お知らせを送る
フォロワー
お寺の情報
━━━━━━━━
LINE設定（AdminOnly）
スタッフ管理（AdminOnly）
```

**特徴**: フラット、セリフ体フォント主体、視認性重視

---

### 代替案1：LINE統合強化版

**方針**: テラログLINE中心化に向け、LINE操作を上位グループ化

```
ダッシュボード
    ├─ ナビ: ダッシュボード

コミュニケーション（新）
    ├─ ナビ: イベント一覧
    ├─ ナビ: お知らせ
    ├─ ナビ: LINE配信（AdminOnly）
    └─ ナビ: ステップ配信（AdminOnly）

コンテンツ
    ├─ ナビ: お寺の声
    └─ ナビ: 学びの記事

フォロワー
    └─ ナビ: メンバー一覧

設定
    ├─ ナビ: お寺の設定（AdminOnly）
    └─ ナビ: スタッフ管理（AdminOnly）
```

**メリット**: 
- LINE配信をイベント・お知らせと同グループ化
- コンテンツ（投稿・記事）を明確分離
- 階層3段階に最適化

**デメリット**: 
- グループ名が日本語で統一（UI色調は要調整）

---

### 代替案2：業務フロー優先版

**方針**: 管理者の日次・週次業務フローに合わせた構成

```
きょうの動き
    └─ ナビ: ダッシュボード

準備・企画
    ├─ ナビ: イベント一覧
    ├─ ナビ: お知らせ
    └─ ナビ: コンテンツ管理（お寺の声・記事）

運用・配信
    ├─ ナビ: メンバー一覧
    ├─ ナビ: LINE配信（AdminOnly）
    └─ ナビ: ステップ配信（AdminOnly）

管理
    ├─ ナビ: お寺の設定（AdminOnly）
    ├─ ナビ: スタッフ管理（AdminOnly）
    └─ ナビ: 操作ログ
```

**メリット**: 
- 業務サイクルに沿った直感的グループ分け
- 新ユーザーが迷いにくい

**デメリット**: 
- 「準備・企画」に複数種別が混在

---

### 代替案3：権限別表示最適化版

**方針**: ADMIN/STAFF ロール別に最適化されたナビゲーション

```
共通:
    ├─ ダッシュボード
    ├─ イベント一覧
    ├─ お知らせ
    ├─ メンバー一覧
    └─ コンテンツ（お寺の声・記事）

ADMIN専用:
    ├─ LINE配信・ステップ設定
    ├─ お寺の設定
    ├─ スタッフ管理
    └─ 操作ログ
```

**メリット**: 
- STAFF は不要な設定項目を見ない
- 管理者画面の認知負荷軽減

**デメリット**: 
- ロール別表示が複雑化

---

## セクション7：重複・抜け漏れ・不整合

### 重複機能

1. **イベント関連**
   - `/admin/events/[id]/edit` と `/admin/events/[id]/participants` が一部重複
   - 推測：edit で詳細変更、participants で参加者リスト・ステータス変更
   - **改善案**: edit と participants の責任分離を明確化（UI表示）

2. **LINE配信**
   - `/admin/line/messages` と `/admin/line/sequences` の役割が重複気味
   - 現状：messages は一次的配信、sequences は自動配信だが、UIで混乱可能性
   - **改善案**: 「手動配信」「自動配信」と明確に分ける

3. **コンテンツ管理**
   - お寺の声（posts）と学びの記事（articles）がほぼ同じUI
   - SuperAdmin と Admin の管理範囲が曖昧
   - **改善案**: 所有者表示を明確化（articles: SuperAdmin/管理、posts: 各寺院）

4. **フォロワー情報**
   - `/admin/members/[id]` と `/admin/members/[id]/edit` の切り分けが不明確
   - **改善案**: view と edit を同画面化するか、機能を明確分離

### 抜け漏れ機能

1. **イベント開催後の自動対応**
   - イベント完了後のLINE自動リマインダー（感想投稿促進）が見当たらない
   - **要実装**: イベント後 +2 日目に「感想を書いてくださいLINE」自動配信

2. **お寺ごとのLINE統計**
   - `/admin/line` はテンプル単位の配信統計が不明確
   - **要実装**: 寺院ごとの配信成功率・開封率ダッシュボード

3. **会員セグメント配信**
   - タグ別・参加状況別のセグメント配信UI がない
   - **要実装**: 「未参加者向け」「タグ=VIP向け」などのセグメント配信機能

4. **イベント前 LINE 自動配信**
   - 現状：ステップ配信で「初参加」「LINE登録」トリガーのみ
   - **抜け漏れ**: 「イベント開始前日」「イベント開始時刻の朝」の自動リマインダーが要件に明記されているが実装確認不可
   - **要実装**: スケジュール配信 + 条件付き自動配信の統合

5. **ユーザー向けLINE通知設定の粒度**
   - 現状：lineNotifyEnabled / notifyEvent / notifyAnnouncement の3段階
   - **要検討**: 「イベント前日リマインダー」「当日朝リマインダー」の分離設定

6. **キャンセル・変更時のLINE通知**
   - イベント キャンセル時に参加者へのLINE配信が見当たらない
   - **要実装**: キャンセル発生時の自動LINE通知

### v2.2 方針との不整合

1. **テラログ公式LINE への統一**
   - ✅ 実装確認: `/app/mypage/line` で「テラログ公式LINE」連携UI あり
   - ⚠️ 不整合: `/admin/line` の説明文が「お寺のLINE」か「テラログLINE」かが曖昧
   - **修正**: `/admin/line` UI 文言を全て「テラログ公式LINE」に統一

2. **お寺別LINE廃止予定**
   - ⚠️ 警告: `Temple.lineOfficialUrl` が schema に存在
   - ⚠️ 警告: `/admin/settings` でLINE公式アカウント URL入力フィールドが残っている可能性
   - **修正**: UI から削除予定（v2.3）

3. **v2.2 で廃止予定の属性（DANKA/GOEN）**
   - ⚠️ 警告: `/admin/members/import` の CSV サンプルに DANKA / GOEN が記載
   - ⚠️ 警告: Member schema に deprecated `MemberType` enum 存在
   - **修正**: import UI のサンプル削除、スキーマコメント追加（既に deprecated 表記あり）

4. **高齢者対応 UI**
   - ✅ 実装確認: User.displayMode / fontSize / highContrast あり
   - ⚠️ 不整合: `/admin` 画面に高齢者向け表示切り替えが見当たらない
   - **確認必要**: 利用者向け（/app）のみの対応か、管理者向けも対応予定か

5. **プロキシアカウント（代理人機能）**
   - ✅ 実装確認: Member.proxyUserId / proxyRelation あり
   - ⚠️ 不明確: `/admin/members/[id]` でこの機能が表示されるか不明
   - **確認必要**: 代理人管理UI が存在するか

6. **テーブル「お寺の声」文言統一**
   - ✅ 実装: "お寺の声" で統一（投稿）
   - ✅ 実装: "学びの記事" で統一（記事）
   - ✅ OK: 重複なし

---

## まとめ

**総機能スクリーン数**
- 管理者向け: 33画面
- 利用者向け: 27画面
- API エンドポイント: 50+ 推定

**LINE関連機能**
- テラログ公式LINE統合: 完了度 80%（テンプレート機能・統計欠落）
- ステップ配信: 実装済み（トリガー明確化が必要）
- 自動リマインダー（前日・当日朝）: 実装確認不可（要確認）

**修正優先度 TOP 3**
1. イベント前日・当日朝のLINE自動リマインダー実装確認（v2.2 要件）
2. `/admin/line` UI 文言を「テラログ公式LINE」に統一、お寺別LINE説明削除
3. `/admin/members/import` の DANKA/GOEN サンプル削除、テンプレート機能追加

