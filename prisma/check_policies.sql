SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('events', 'announcements', 'members', 'temples')
ORDER BY tablename, policyname;
