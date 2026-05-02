# TeraLog v2 リファクタリング設計ドキュメント

> このドキュメントは Claude Code への作業依頼書です。
> 既存の TeraLog コードベース（Next.js + Supabase + Stripe + Prisma、`teralog.app`）を v2 コンセプトに沿ってリファクタリングするための完全な仕様書として機能します。

---

## 0. 作業方針（最重要）

**既存コードベースを修正する方向で進めます。完全な作り直しは不要です。**

維持するもの: 認証基盤、Stripe Connect、LINE webhook、Vercel デプロイ、`teralog.app` ドメイン、技術スタック（Next.js + Supabase + Stripe + Prisma）、ご縁さん向け PWA の枠組み。

書き換えるもの: メンバー管理ドメイン（Member, MemberStage 関連）、檀家関連の UI / ロジック / ルート、データモデル全般。

作業中に「修正よりリライトの方が速い」と判断した領域があれば、その都度報告してから進めてください。

---

## 1. コンセプト

### ミッション
**より多くの人が、お寺に関わる機会を作る。**

### タグライン
「ご縁から始まる、お寺の経営プラットフォーム」

### プロダクトの正体
**お寺の Linktree + イベント決済 + ライト CRM をワンパッケージにした SaaS。**

3つの既存サービスのお寺特化版が1つに繋がっているのが差別化要素。Linktree で発見させて、イベント決済で体験させて、CRM で関係を継続する。

### 旧コンセプトとの違い
旧コンセプトは「ご縁さんを檀家に変える」ファネルを設計の中心に据えていた。v2 では檀家化を KPI から外し、「お寺と人の関係性を多層的・継続的にデザインする」プラットフォームに転換する。

「檀家」は廃止ではなく、お寺ごとに自由に定義できる「メンバーシップタイプ」のうちの1つ（伝統型テンプレート）として残す。

---

## 2. ユーザータイプ

MVP では2軸構成。

1. **寺院側ユーザー**: 住職、寺嫁、後継者、寺務担当
2. **参加者ユーザー**（旧「ご縁さん」）: お寺と関わる一般ユーザー

「イベント主催者」型ユーザーは Phase 3 以降で検討する。MVP には含めない。

---

## 3. 機能アーキテクチャ：2軸 × 4レイヤー

寺院側と参加者側、それぞれに「発見 → 体験 → 関係 → 継続」の4レイヤー。

| レイヤー | 寺院側 | 参加者側 |
|---|---|---|
| ① 発見 | お寺プロフィール公開 | お寺・イベント検索 |
| ② 体験 | イベント運営・決済 | イベント参加・決済 |
| ③ 関係 | メンバー管理・履歴・タグ | 参拝履歴・お気に入り |
| ④ 継続 | メンバーシップ運用 | メンバーシップ加入 |

MVP の目標は「このファネルが端から端まで一周する最小構成」。

---

## 4. 機能棚卸し

### 4.1 寺院側機能

#### MVP（明鏡寺パイロットに必要）

| # | 機能 | 概要 |
|---|---|---|
| T-01 | お寺プロフィール | 住所、紹介文、Instagram / HP / LINE 公式 / YouTube などの外部リンク、写真。発見の起点。 |
| T-02 | イベント作成・公開 | タイトル、日時、場所、定員、料金、説明、写真。作成5分以内を目標とする UI。 |
| T-03 | 参加者管理 | イベントごとの参加者リスト、参加人数の可視化、当日チェックイン。 |
| T-04 | 決済受付 | Stripe Connect で参加費を直接受け取る。事前決済が基本。 |
| T-05 | メンバー一覧・詳細 | 過去にイベント参加・参拝した人を一元管理。エンゲージメントスコア表示。 |
| T-06 | メモ・タグ付け | フリーテキストメモ、自由なタグ（例「写経常連」「コーヒー好き」「遠方」）。 |
| T-07 | 参拝履歴の記録 | 参加者の自己記録 or 寺院側からの記録。両方をメンバー詳細に統合表示。 |
| T-08 | メンバーシップ管理 | v2 スキーマ（MembershipType / Membership / Stage）の運用画面。 |

#### Phase 2（他寺院展開時）

| # | 機能 |
|---|---|
| T-09 | LINE 連携でのお知らせ配信（一斉、セグメント） |
| T-10 | エンゲージメントスコアの自動計算 |
| T-11 | 自動昇格ルール（参加回数等でステージ遷移） |
| T-12 | 定期イベントの繰り返し設定 |
| T-13 | 収益ダッシュボード（メンバーシップ別、イベント別） |
| T-14 | メール配信（LINE 未登録者向け） |

#### 見送り（少なくとも数年は作らない）

旧コンセプトの遺産。今回のレイヤーとは別物として切り離す。

- 法事・葬儀ワークフロー（FuneralRequest, KaimyoRecord）
- 戒名管理・寺院会計
- 檀家総会・寺族管理

### 4.2 参加者側機能

#### MVP

| # | 機能 | 概要 |
|---|---|---|
| P-01 | ユーザー登録・ログイン | メール or LINE ログイン。 |
| P-02 | 近くのお寺検索 | 位置情報ベース、地図 UI、お寺プロフィール閲覧。 |
| P-03 | イベント検索・閲覧 | 日付、場所、カテゴリで絞り込み。 |
| P-04 | イベント申込・決済 | その場で予約完了、Stripe 決済、確認メール送信。 |
| P-05 | 参拝履歴の自己記録 | 「○月○日、明鏡寺を参拝」を記録。任意でメモ・写真。 |
| P-06 | マイページ | 参加予定イベント、過去の参加履歴、参拝履歴の一覧。 |

#### Phase 2

| # | 機能 |
|---|---|
| P-07 | お寺のお気に入り登録（通知受信） |
| P-08 | 参拝バッジ・実績可視化 |
| P-09 | メンバーシップ加入・管理（月額サポーター登録、解約、領収書） |
| P-10 | 友達招待・SNS シェア |
| P-11 | お寺へのレビュー・感想 |

#### 見送り

- マッチング・出会い系要素
- 寄付の使途指定・透明性レポート
- 仏教学習コンテンツ・経典閲覧

### 4.3 やらないことの明示

- イベント主催者向け機能（マッチング、オファー、募集）
- 法事・葬儀・戒名・会計（旧コンセプトの遺産）
- SNS 的機能（タイムライン、フォロー、いいね）。既存 SNS（Instagram 等）を使えばよい
- 汎用予約システム化（お寺特化を捨てると差別化が消える）
- 宗派限定機能（プロダクトは超宗派で作る）

---

## 5. データモデル：v2 Prisma スキーマ

### 5.1 削除するもの

- `MemberStage` enum（`GOEN` / `PROSPECT` / `DANKA_CANDIDATE` / `DANKA`）を完全削除
- 「檀家」専用のロジック・UI・ルート
- 三役割システムから「檀家」役割を削除（admin / 寺院管理者 / 参加者 の3役割に再編）

### 5.2 新規追加モデル

```prisma
// 人（誰がそのお寺と関わっているか）
model Member {
  id              String        @id @default(cuid())
  templeId        String
  name            String
  contact         Json?         // email, phone, LINE userId, etc.
  engagementScore Int           @default(0)
  firstContactAt  DateTime
  memberships     Membership[]
  events          MemberEvent[]
  visits          Visit[]
  tags            MemberTag[]
  notes           MemberNote[]
}

// メンバーシップの「型」をお寺ごとに自由に定義
model MembershipType {
  id            String            @id @default(cuid())
  templeId      String
  name          String            // 例: "ご縁さん" "月額サポーター" "檀家" "巡礼会員"
  description   String?
  pricingModel  PricingModel      // FREE / ONE_TIME / SUBSCRIPTION / DONATION
  priceJpy      Int?
  billingCycle  BillingCycle?     // MONTHLY / YEARLY
  stages        MembershipStage[]
  isPublic      Boolean           @default(true)
}

// メンバーシップ内のステージ（任意、お寺が設計可能）
model MembershipStage {
  id                String   @id @default(cuid())
  membershipTypeId  String
  name              String   // 例: "新規" "アクティブ" "コア"
  order             Int
  autoPromoteRules  Json?    // エンゲージメント条件で自動昇格
}

// 人 × メンバーシップ型の関係（実体）
model Membership {
  id                 String            @id @default(cuid())
  memberId           String
  membershipTypeId   String
  currentStageId     String?
  status             MembershipStatus  // ACTIVE / PAUSED / CHURNED
  joinedAt           DateTime
  stripeSubId        String?
  metadata           Json?
}

// 参拝履歴
model Visit {
  id          String   @id @default(cuid())
  memberId    String
  templeId    String
  visitedAt   DateTime
  source      VisitSource  // SELF_REPORT / TEMPLE_RECORD / EVENT_CHECKIN
  note        String?
  photoUrl    String?
}

// メンバーへのタグ
model MemberTag {
  id        String   @id @default(cuid())
  memberId  String
  templeId  String
  label     String   // 自由テキスト
  createdAt DateTime @default(now())

  @@index([templeId, label])
}

// メンバーへのメモ
model MemberNote {
  id        String   @id @default(cuid())
  memberId  String
  authorId  String   // 寺院側ユーザー
  body      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum PricingModel {
  FREE
  ONE_TIME
  SUBSCRIPTION
  DONATION
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

enum MembershipStatus {
  ACTIVE
  PAUSED
  CHURNED
}

enum VisitSource {
  SELF_REPORT
  TEMPLE_RECORD
  EVENT_CHECKIN
}
```

### 5.3 既存モデルの扱い

- お寺プロフィールに外部リンクフィールドを追加（`instagramUrl`, `websiteUrl`, `lineOfficialUrl`, `youtubeUrl`）
- イベント関連モデルは既存のものをベースに調整
- ご縁さん向け PWA で使っていた User モデルは Member モデルとリレーションを維持

### 5.4 重要な設計原則

- **同じ Member が複数の Membership を持てる**前提でクエリを設計する。例：田中さんが「ご縁さん（無料）」かつ「月額サポーター（¥1,000/月）」かつ「写経会員（イベント単発）」を同時に持てる。
- 「檀家かどうか」の二項対立を完全に排除する。すべてのお寺との関係は Membership 経由で表現する。
- n+1 問題に注意。Member 一覧から各人の Membership を取りに行くクエリは事前に最適化する。

---

## 6. 初期メンバーシップテンプレート

寺院管理者がセットアップ時に選択できるプリセット。選択すると `MembershipType` が自動生成される。

| # | テンプレート名 | プリセット内容 |
|---|---|---|
| 1 | 伝統型 | 「檀家」「総代」 |
| 2 | モダン型 | 「ご縁さん」「月額サポーター」「写経会員」 |
| 3 | 観光寺型 | 「拝観者」「年間パス」「巡礼会員」 |
| 4 | 小規模寺型 | 「ご縁さん」のみ（無料） |
| 5 | カスタム | ゼロから自由に設計 |

セットアップウィザードで1つ選択 → `MembershipType` が一括作成される実装にする。

---

## 7. UI/UX 要件

### 7.1 寺院側管理画面

- ダッシュボード: 今月の参加予定者数、新規メンバー数、収益サマリー
- メンバーシップ設計画面: `MembershipType` の作成・編集・削除
- メンバー一覧: フィルタ（タグ、メンバーシップ、最終接触日）、ソート、検索
- メンバー詳細: 基本情報、メモ、タグ、参拝履歴、イベント参加履歴、所属メンバーシップ
- イベント作成画面: 5分以内で公開できるシンプルさを優先
- お寺プロフィール編集: 外部リンク（Instagram / HP / LINE / YouTube）を最上部に配置

### 7.2 参加者側 PWA

- お寺検索: 地図 UI（位置情報ベース）+ リスト UI のトグル
- お寺プロフィール: 外部リンクへの導線を最上部
- イベント詳細: 日時、場所、定員、残席、料金、申込ボタン
- マイページ: 参加予定、参加履歴、参拝履歴の3タブ
- 参拝記録: ワンタップで記録完了する UI

### 7.3 共通

- 初回オンボーディングは必要最小限のステップ数で
- 寺院側は「メンバーシップ設計」を後回しにできる導線（テンプレート選択がデフォルト、カスタムは上級者向け）

---

## 8. 「使われる」ためのキー機能（重点投資領域）

棚卸しの結果、特に住職側の継続利用を駆動する3機能を重点投資領域として明示する。

1. **外部リンクハブとしてのお寺プロフィール**: Linktree のお寺版ポジショニング。Instagram / HP / LINE / YouTube への動線を集約。
2. **摩擦ゼロのイベント決済**: 事前決済で当日のお金のやりとりを完全に排除。小規模寺院ほど運営負荷が下がる。
3. **メンバー詳細のタグ・メモ**: 「次に来たときに思い出せる」CRM 価値。データが資産化して離脱できなくなる。

これらの機能は、他の MVP 機能よりも UX 品質に投資する。

---

## 9. 受入基準

1. 既存 MVP 機能（認証、参加者登録、決済、LINE 連携）が引き続き動作する
2. 寺院管理者が「メンバーシップ設計」画面で新しい `MembershipType` を作成できる
3. 同じ Member が複数の Membership を持てる
4. 初期テンプレート5種類が選択可能で、選ぶと `MembershipType` が自動生成される
5. Prisma マイグレーションが破壊的でも問題なく実行できる（pre-prod 前提）
6. お寺プロフィールに Instagram / HP / LINE / YouTube の外部リンクフィールドが追加されている
7. メンバー詳細画面でタグ・メモ・参拝履歴・イベント履歴が一覧表示される
8. 参加者 PWA で「近くのお寺検索」「イベント申込・決済」「参拝履歴の自己記録」がワンセッションで完結する

---

## 10. 完了後のレポート要求

作業完了時に以下を報告すること:

- 変更したファイル一覧
- 削除したファイル / モデル
- 追加したファイル / モデル
- 動作確認した機能と確認方法
- 既知の不具合・未対応項目
- 次に手をつけるべき領域の提案（Phase 2 機能の優先順位含む）

---

## 11. 補足：KPI 設計（運用開始後）

新コンセプトでは以下の指標を追跡する。MVP 実装時に計測できる仕込みをしておく。

- お寺あたりの月間アクティブ参加者数
- 寺院管理者の週間ログイン率
- 参加者→お寺の月間アクション数（イベント参加、寄付、連絡など）
- お寺のメンバーシップ収益（檀家収入以外）

契約後3ヶ月で「使われている / 使われていない」が判定できるダッシュボードを Phase 2 で構築する。

---

## 12. 参考情報

- ドメイン: `teralog.app`（Cloudflare 経由で登録済み）
- インフラ: Vercel（フロント）、Supabase（DB / Auth）、Resend（メール）、Stripe（決済）
- 最初のパイロット先: 明鏡寺（Takeki の家寺、父が住職）
- フルローンチ予定: 2028年4月以降（Takeki の叡山学院卒業後）
- スタンバイモード期間: 2026年4月〜2028年3月（叡山学院在学中）。この期間は実装着手しない可能性が高い

---

*このドキュメントは 2026年5月時点の設計方針です。スタンバイモード期間中の方針変更があった場合は更新してください。*