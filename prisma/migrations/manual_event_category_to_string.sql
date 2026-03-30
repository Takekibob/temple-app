-- event_category enum を text に変更
ALTER TABLE events ALTER COLUMN category TYPE TEXT USING category::TEXT;
-- 使われなくなった enum 型を削除
DROP TYPE IF EXISTS event_category;
