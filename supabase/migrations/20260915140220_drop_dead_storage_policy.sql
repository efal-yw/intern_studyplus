-- Storage に残っていたダッシュボードの雛形ポリシーを消す。
--
--   create policy "Give users authenticated access to folder 1oj01fe_2"
--     on storage.objects for UPDATE to public
--     using (bucket_id = 'avatars'
--            and (storage.foldername(name))[1] = 'private'
--            and auth.role() = 'authenticated');
--
-- Supabase のポリシーテンプレートをそのまま適用したときに付く名前で、
-- 末尾の 1oj01fe_2 は自動生成の識別子。意図が名前から読めない。
--
-- 対象は avatars/private/ 配下だが、INSERT 側の avatars_insert_own が
-- (storage.foldername(name))[1] = auth.uid()::text を要求するため、
-- そこにファイルを置く経路が無い。つまり一度も効いたことがない。
--
-- 穴にもなっていない (述語が auth.role() = 'authenticated' を要求するので
-- to public でも anon は通らない)。消すのは掃除が目的で、緊急性は無い。
--
-- アバターの権限は avatars_insert_own / avatars_delete_own が担っていて、
-- どちらも folder[1] = auth.uid() の形。このポリシーを消しても
-- 現在の機能には影響しない。

drop policy if exists "Give users authenticated access to folder 1oj01fe_2"
  on storage.objects;
