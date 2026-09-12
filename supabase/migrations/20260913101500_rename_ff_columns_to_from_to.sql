-- ff のカラム名を follower_id / followee_id から from_user_id / to_user_id に変える。
-- -er と -ee は3文字しか違わず、書くたびにどちらが「フォローする側」か迷う。
-- (実際にプロフィールページで向きを逆に書いたまま気づかないバグが出た)
--
--   from_user_id = フォローする側
--   to_user_id   = フォローされる側
--
-- カラムを rename しても、依存する RLS ポリシー・関数・外部キーは Postgres が
-- 自動で追随するので、ここで張り直す必要はない。
-- (制約名だけは古いまま: ff_follower_id_fkey → 名前は変わらない)
alter table public.ff rename column follower_id to from_user_id;
alter table public.ff rename column followee_id to to_user_id;

-- 同じ相手を二重にフォローできないようにする。
-- フォロー/解除のトグルは「重複エラー(23505)が返ったら既にフォロー済み = 成功」
-- として連打を吸収するので、この一意制約が無いと連打で行が増える。
-- (likes の likes_unique と同じ考え方)
create unique index if not exists ff_from_to_unique
  on public.ff (from_user_id, to_user_id);

-- 自分で自分をフォローできないようにする。
-- サーバーアクション側でも弾いているが、UI を通らない POST も届くのでDBでも縛る。
alter table public.ff
  add constraint ff_no_self_follow check (from_user_id <> to_user_id);

-- RLS。フォロー/解除はログインユーザー自身の行だけ触れる。
alter table public.ff enable row level security;

drop policy if exists "フォロー関係は誰でも読める" on public.ff;
create policy "フォロー関係は誰でも読める" on public.ff
  for select to authenticated
  using (true);

drop policy if exists "自分からのフォローだけ追加できる" on public.ff;
create policy "自分からのフォローだけ追加できる" on public.ff
  for insert to authenticated
  with check (from_user_id = auth.uid());

drop policy if exists "自分からのフォローだけ解除できる" on public.ff;
create policy "自分からのフォローだけ解除できる" on public.ff
  for delete to authenticated
  using (from_user_id = auth.uid());
