-- 投稿の削除。
--
-- 子テーブル (post_record / post_ask / post_knowledge / likes / comments) は
-- FK が on delete cascade なので、posts の行を消せば一緒に消える。
-- アプリ側で1つずつ delete を並べる必要は無い。
--
-- 【ここが本当の防御線】
-- サーバーアクション側にも所有者チェックを書いてあるが、あれは親切なエラーを
-- 返すためのもので、security boundary ではない。サーバーアクションは UI を
-- 通さない POST でも叩けるので、他人の post_id を渡されても消えないことは
-- このポリシーだけが保証する。
--
-- ff_insert_self で一度踏んでいる通り、ポリシーの向きを間違えると
-- 「自分のものだけ」のつもりが「他人のものも」になる。
-- 適用後、別アカウントで他人の投稿を消せないことを必ず確認すること。
--
-- cascade で消える子テーブルに delete ポリシーは要らない。cascade は RLS を
-- 経由せず DB 内部で実行されるため。裏を返すと、このポリシーが緩いと
-- 子テーブル側のポリシーは一切の防御にならない。

alter table public.posts enable row level security;

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
  for delete to authenticated
  using (user_id = auth.uid());
