-- user_tag に select ポリシーを付ける。
--
-- なぜ:
--   /users/[id] に app/users/user_tags.tsx を足して、他人のプロフィールでも
--   タグを出すようにした。user_tag は tags / post_tags と同じく
--   ダッシュボードで直接作られていてマイグレーションが無く
--   (20261001090540_user_tag_allow_multiple_tags.sql も制約の付け替えだけ)、
--   ポリシーの中身がリポジトリから追えない。
--
--   「RLS 有効 + ポリシー0件」や「user_id = auth.uid() だけ」の状態だと、
--   他人のページで select が成功して error は null のまま0件になり、
--   タグが黙って消える。user_tags.tsx の `if (error)` は発動せず、
--   空配列のまま .map() が何も描かない
--   (20260916013127_tags_rls_policies.sql と全く同じ症状)。
--
-- 冪等に書く。ローカルDBが無く本番に直接流すため、途中で落ちても
-- 同じファイルを流し直せるようにしておく。
--
-- テーブル定義そのものはここで作らない。既に本番に存在しているため、
-- create table を書くと流せなくなる。現在の形 (lib/database.types.ts から):
--   user_tag (user_id uuid → users.id, tag_id uuid → tags.id,
--             primary key (user_id, tag_id))

alter table public.user_tag enable row level security;


-- 読み: 全ログインユーザーに開ける ------------------------------------------
--
-- user_tag は「このユーザーにこのタグが付いている」だけを持つ。隠す理由が
-- 無く、プロフィールは users_select_all で誰でも見られるので、同じ扱いに
-- そろえる。
--
-- 対象ロールを authenticated にして anon を外してあるのも users_select_all /
-- tags_select_authenticated に合わせたもの。
-- 【将来プロフィールを未ログインでも見せるなら、ここを public に広げる
--   必要がある】。tags_select_authenticated も同時に広げないと、
--   tag_id は返るが tags(name) が null になって空のタグが並ぶ。

drop policy if exists user_tag_select_authenticated on public.user_tag;

create policy user_tag_select_authenticated on public.user_tag
  for select to authenticated
  using (true);

-- 書き込みポリシーは【意図的に作っていない】。
-- tags_select_authenticated と同じ方針で、現状タグを付け外しする画面が
-- 無く (mypage も /users/[id] も表示のみ)、割り当てはダッシュボード
-- (service_role = RLS をバイパス) から行う想定のため。
-- ユーザーが自分でタグを選べる UI を足すときに、そこで
--   using / with check (user_id = auth.uid())
-- の insert / delete ポリシーを追加すること。無いうちは insert が
-- 黙って0件になる。


-- 索引 -----------------------------------------------------------------------
--
-- user_id 側は (user_id, tag_id) の主キー索引の先頭列なので足りている。
-- tag_id 側は 20261001090540 で user_tag_tag_id_idx を張ってある。
-- このファイルで追加するものは無い。
