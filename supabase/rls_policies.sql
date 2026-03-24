-- ============================================================
-- てらログ - Supabase Row Level Security ポリシー
--
-- 適用方法: Supabase Dashboard > SQL Editor で実行
-- 前提: prisma migrate dev によるテーブル作成が完了済みであること
--
-- ロール定義:
--   SUPER_ADMIN / ADMIN / STAFF ... 管理側
--   MEMBER (+ member.type = DANKA) ... 檀家
--   MEMBER (+ member.type = GOEN)  ... ご縁さん
-- ============================================================

-- ============================================================
-- ヘルパー関数
-- auth.jwt() ->> 'email' でSupabase AuthのJWTからメールを取得し、
-- publicスキーマの users テーブルと突合する
-- ============================================================

-- 現在のログインユーザーのDBレコードIDを返す
CREATE OR REPLACE FUNCTION public.my_user_id()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE email = (auth.jwt() ->> 'email')
$$;

-- 現在のログインユーザーのroleを返す
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.role
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE email = (auth.jwt() ->> 'email')
$$;

-- 現在のログインユーザーが管理者/スタッフか
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE email = (auth.jwt() ->> 'email')
      AND role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF')
  )
$$;

-- 現在のログインユーザーのmember_typeを返す (NULL = 会員レコードなし)
CREATE OR REPLACE FUNCTION public.my_member_type()
RETURNS public.member_type
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.type
  FROM public.members m
  JOIN public.users u ON m."userId" = u.id
  WHERE u.email = (auth.jwt() ->> 'email')
$$;

-- 現在のログインユーザーのmember IDを返す
CREATE OR REPLACE FUNCTION public.my_member_id()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id
  FROM public.members m
  JOIN public.users u ON m."userId" = u.id
  WHERE u.email = (auth.jwt() ->> 'email')
$$;

-- ============================================================
-- temples テーブル
-- SELECT: 認証済み全員（自寺院のみ）
-- UPDATE: ADMIN / SUPER_ADMIN のみ
-- INSERT/DELETE: SUPER_ADMIN のみ
-- ============================================================
ALTER TABLE public.temples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temples_select"
  ON public.temples FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT "templeId" FROM public.users WHERE email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "temples_update"
  ON public.temples FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "temples_insert"
  ON public.temples FOR INSERT
  TO authenticated
  WITH CHECK (public.my_role() = 'SUPER_ADMIN');

CREATE POLICY "temples_delete"
  ON public.temples FOR DELETE
  TO authenticated
  USING (public.my_role() = 'SUPER_ADMIN');

-- ============================================================
-- users テーブル
-- SELECT: 自分自身 OR 管理者/スタッフ（同寺院）
-- UPDATE: 自分自身のみ（roleは変更不可）
-- INSERT: ADMIN / SUPER_ADMIN のみ
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    email = (auth.jwt() ->> 'email')
    OR public.is_admin_or_staff()
  );

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));

CREATE POLICY "users_insert"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (public.my_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- anon ユーザーは一切アクセス不可（Supabase Auth経由のみ許可）
CREATE POLICY "users_anon_deny"
  ON public.users FOR ALL
  TO anon
  USING (false);

-- ============================================================
-- members テーブル
-- SELECT: 自分自身 OR 管理者/スタッフ
-- UPDATE: 管理者/スタッフのみ（自分のプロフィールはUser側で管理）
-- INSERT: 管理者/スタッフのみ
-- ============================================================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select"
  ON public.members FOR SELECT
  TO authenticated
  USING (
    "userId" = public.my_user_id()
    OR public.is_admin_or_staff()
  );

CREATE POLICY "members_update"
  ON public.members FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "members_insert"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "members_delete"
  ON public.members FOR DELETE
  TO authenticated
  USING (public.my_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- ============================================================
-- deceased_persons テーブル（過去帳）
-- SELECT: 自分の家の故人 OR 管理者/スタッフ
-- INSERT/UPDATE/DELETE: 管理者/スタッフのみ
-- ============================================================
ALTER TABLE public.deceased_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deceased_persons_select"
  ON public.deceased_persons FOR SELECT
  TO authenticated
  USING (
    "memberId" = public.my_member_id()
    OR public.is_admin_or_staff()
  );

CREATE POLICY "deceased_persons_write"
  ON public.deceased_persons FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================
-- reservations テーブル（予約）
-- SELECT: 自分の予約 OR 管理者/スタッフ
-- INSERT: 自分自身（DANKAのみ）OR 管理者/スタッフ
-- UPDATE: 管理者/スタッフのみ（ステータス変更等）
-- ============================================================
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_select"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (
    "memberId" = public.my_member_id()
    OR public.is_admin_or_staff()
  );

CREATE POLICY "reservations_insert"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      "memberId" = public.my_member_id()
      AND public.my_member_type() = 'DANKA'
    )
    OR public.is_admin_or_staff()
  );

CREATE POLICY "reservations_update"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "reservations_delete"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (
    ("memberId" = public.my_member_id() AND status = 'PENDING')
    OR public.is_admin_or_staff()
  );

-- ============================================================
-- events テーブル（イベント）
-- SELECT:
--   anon      → visibility = 'PUBLIC' かつ status = 'PUBLISHED' のみ
--   認証済み   → PUBLIC + MEMBERS_ONLY（認証済み） + DANKA_ONLY（DANKAのみ）
-- INSERT/UPDATE: 管理者/スタッフのみ
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 未ログインユーザーは公開イベントのみ
CREATE POLICY "events_select_anon"
  ON public.events FOR SELECT
  TO anon
  USING (
    visibility = 'PUBLIC'
    AND status = 'PUBLISHED'
  );

-- ログイン済みユーザー
CREATE POLICY "events_select_authenticated"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    -- 管理者/スタッフは全件
    public.is_admin_or_staff()
    OR (
      -- 公開イベント: 全会員
      (visibility = 'PUBLIC' AND status = 'PUBLISHED')
      -- 会員限定: 認証済み全員
      OR (visibility = 'MEMBERS_ONLY' AND status = 'PUBLISHED')
      -- 檀家限定: DANKA のみ
      OR (visibility = 'DANKA_ONLY' AND status = 'PUBLISHED' AND public.my_member_type() = 'DANKA')
    )
  );

CREATE POLICY "events_write"
  ON public.events FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================
-- event_participations テーブル（イベント参加申込）
-- SELECT: 自分の申込 OR 管理者/スタッフ
-- INSERT: 認証済みユーザー（visibilityチェックはアプリ層で行う）
-- UPDATE/DELETE: 管理者/スタッフ OR 自分自身（キャンセル）
-- ============================================================
ALTER TABLE public.event_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_participations_select"
  ON public.event_participations FOR SELECT
  TO authenticated
  USING (
    "memberId" = public.my_member_id()
    OR public.is_admin_or_staff()
  );

CREATE POLICY "event_participations_insert"
  ON public.event_participations FOR INSERT
  TO authenticated
  WITH CHECK ("memberId" = public.my_member_id());

CREATE POLICY "event_participations_update"
  ON public.event_participations FOR UPDATE
  TO authenticated
  USING (
    "memberId" = public.my_member_id()
    OR public.is_admin_or_staff()
  )
  WITH CHECK (
    "memberId" = public.my_member_id()
    OR public.is_admin_or_staff()
  );

CREATE POLICY "event_participations_delete"
  ON public.event_participations FOR DELETE
  TO authenticated
  USING (
    "memberId" = public.my_member_id()
    OR public.is_admin_or_staff()
  );

-- ============================================================
-- ofuse テーブル（お布施）
-- SELECT: 自分の履歴 OR 管理者/スタッフ
-- INSERT/UPDATE/DELETE: 管理者/スタッフのみ
-- ============================================================
ALTER TABLE public.ofuse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ofuse_select"
  ON public.ofuse FOR SELECT
  TO authenticated
  USING (
    "memberId" = public.my_member_id()
    OR public.is_admin_or_staff()
  );

CREATE POLICY "ofuse_write"
  ON public.ofuse FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================
-- gojikai_rules テーブル（護持会費ルール）
-- SELECT: 同寺院の認証済みユーザー全員
-- INSERT/UPDATE/DELETE: ADMIN / SUPER_ADMIN のみ
-- ============================================================
ALTER TABLE public.gojikai_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gojikai_rules_select"
  ON public.gojikai_rules FOR SELECT
  TO authenticated
  USING (
    "templeId" IN (
      SELECT "templeId" FROM public.users WHERE email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "gojikai_rules_write"
  ON public.gojikai_rules FOR ALL
  TO authenticated
  USING (public.my_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.my_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- ============================================================
-- gojikai_payments テーブル（護持会費支払い）
-- SELECT: 自分のDANKAレコード OR 管理者/スタッフ
-- INSERT/UPDATE/DELETE: 管理者/スタッフのみ
-- ============================================================
ALTER TABLE public.gojikai_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gojikai_payments_select"
  ON public.gojikai_payments FOR SELECT
  TO authenticated
  USING (
    (
      "memberId" = public.my_member_id()
      AND public.my_member_type() = 'DANKA'
    )
    OR public.is_admin_or_staff()
  );

CREATE POLICY "gojikai_payments_write"
  ON public.gojikai_payments FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================
-- announcements テーブル（お知らせ）
-- SELECT (anon):  publishedAt IS NOT NULL AND targetSegment = 'ALL'
-- SELECT (auth):  publishedAt IS NOT NULL AND targetSegment IN ('ALL', DANKAorGOEN)
-- INSERT/UPDATE/DELETE: 管理者/スタッフのみ
-- ============================================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_anon"
  ON public.announcements FOR SELECT
  TO anon
  USING (
    "publishedAt" IS NOT NULL
    AND "targetSegment" = 'ALL'
  );

CREATE POLICY "announcements_select_authenticated"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_staff()
    OR (
      "publishedAt" IS NOT NULL
      AND (
        "targetSegment" = 'ALL'
        OR ("targetSegment" = 'DANKA' AND public.my_member_type() = 'DANKA')
        OR ("targetSegment" = 'GOEN'  AND public.my_member_type() = 'GOEN')
      )
    )
  );

CREATE POLICY "announcements_write"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================
-- annual_events テーブル（年中行事）
-- SELECT: 認証済みユーザー全員
-- INSERT/UPDATE/DELETE: 管理者/スタッフのみ
-- ============================================================
ALTER TABLE public.annual_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "annual_events_select"
  ON public.annual_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "annual_events_write"
  ON public.annual_events FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================
-- member_interactions テーブル（CRMメモ）
-- SELECT / INSERT / UPDATE / DELETE: 管理者/スタッフのみ
-- ============================================================
ALTER TABLE public.member_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_interactions_admin_only"
  ON public.member_interactions FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================
-- 確認クエリ（適用後に実行して確認）
-- ============================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
