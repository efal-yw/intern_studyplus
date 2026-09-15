-- users の RLS を締める。次の3つをまとめて行う。
--
--   1. select を anon から外す (to public → to authenticated)
--   2. 重複している update ポリシーを1本にする
--   3. insert も to authenticated に揃える
--
-- ポリシーはダッシュボードで手作業で作られていて migrations/ に記録が無い
-- 状態から流すことを想定している。そのため全体を冪等に書いてある
-- (drop policy if exists → create policy)。
--
-- 現状はこうなっていた:
--
--   "Users can update own profile"  UPDATE  qual (auth.uid() = id)  check (auth.uid() = id)
--   users_insert_self               INSERT  check (id = auth.uid())
--   users_select_all                SELECT  qual true                roles {public}
--   users_update_self               UPDATE  qual (id = auth.uid())   check なし

alter table public.users enable row level security;


-- 1. select ---------------------------------------------------------------
-- roles が {public} だった。Postgres の PUBLIC は「ログイン済み全員」ではなく
-- 【すべてのロール】で、anon (未ログイン) も含む。qual が true なので、
-- publishable key さえあれば未ログインのまま users の全行を取れていた:
--
--   GET /rest/v1/users?select=*
--
-- proxy.ts のログインゲートはここに効かない。あれが守るのは Next.js の
-- ページだけで、PostgREST は別の口として開いている。キーは NEXT_PUBLIC_ で
-- ブラウザのバンドルに入っており、そもそも公開前提のもの。
--
-- 実害が出ていたのは name 列で、トリガーの不具合 (handle_new_auth_user が
-- 'username' ではなく 'name' を読んでいた) で実在のメールアドレスが入っていた。
-- そちらは 20260915183628 と 20260915183449 で直すが、
-- 「アプリを通らずに全行読める」構造自体はここで閉じておく。
--
-- to authenticated にすると anon にはポリシーが適用されなくなるので、
-- テーブルの GRANT が anon に付いたままでも0件になる。
--
-- ログイン済みからは引き続き全員分が見える。タイムラインが他人の名前と
-- アイコンを出す (record.tsx / getComments.tsx) 以上、ここは開けておく必要がある。
-- アプリは proxy.ts で全ルートをログイン必須にしているので、画面側の影響は無い。
drop policy if exists users_select_all on public.users;
create policy users_select_all on public.users
  for select to authenticated
  using (true);


-- 2. update ---------------------------------------------------------------
-- 同じ内容のポリシーが2本あった。左右が入れ替わっているだけで条件は同一
-- (update で with_check を省くと using がそのまま検査に使われる)。
-- permissive 同士は OR で結合されるため動作上の害は無かったが、
-- 命名規則の違う2本が並んでいるのは手作業の痕跡なので1本に寄せる。
--
-- 残すのは users_update_self 側。スペース入りの名前は参照のたびに
-- クオートが要って扱いにくい。
drop policy if exists "Users can update own profile" on public.users;

-- with_check を明示する。省略しても using が使われるので結果は同じだが、
-- 「自分の行を、自分の行のまま更新する」という意図を読み取れるようにしておく
-- (これが無いと id を他人の値に書き換えられるかどうかが一目で分からない)。
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


-- 3. insert ---------------------------------------------------------------
-- 向きは元から正しい (id = auth.uid())。roles だけ揃える。
--
-- なお、このポリシーは実際にはほぼ使われない。users の行を作っているのは
-- auth.users の on_auth_user_created トリガーで、あれは security definer
-- なので RLS を迂回する。アプリ側から users に insert している箇所も無い。
-- 将来アプリから行を作る経路が増えたときのために残しておく。
drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert to authenticated
  with check (id = auth.uid());


-- delete ------------------------------------------------------------------
-- delete ポリシーは元から無い = 誰も消せない。退会機能が要るまでこのままでよい。
-- 足すときは auth.users 側の削除と一緒に考えること
-- (users だけ消すと投稿の user_id が宙に浮く)。
