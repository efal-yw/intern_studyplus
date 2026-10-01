-- user_tag に insert / delete ポリシーを付ける。
--
-- なぜ:
--   20261001094500_user_tag_rls_policies.sql は select だけを開けて、
--   書き込みポリシーを【意図的に作らなかった】。理由は「タグを付け外しする
--   画面が無く、割り当てはダッシュボード (service_role = RLS をバイパス)
--   から行う想定」で、そのコメント自身が
--     「ユーザーが自分でタグを選べる UI を足すときに、そこで
--       using / with check (user_id = auth.uid()) の insert / delete
--       ポリシーを追加すること」
--   と指示している。
--
--   app/mypage/user_tags.tsx に編集フォーム (TagEditor) を足したので、
--   その追加をここで行う。無いままだと insert は
--   「new row violates row-level security policy」で弾かれ、delete は
--   エラーにならず0件削除で黙って元に戻る
--   (= 保存したのにリロードすると消えている、という形で出る)。
--
-- 冪等に書く。ローカルDBが無く本番に直接流すため、途中で落ちても
-- 同じファイルを流し直せるようにしておく
-- (20261001094500_user_tag_rls_policies.sql と同じ方針)。
--
-- テーブル定義そのものはここで作らない。既に本番に存在しているため。
-- 現在の形 (lib/database.types.ts から):
--   user_tag (user_id uuid → users.id, tag_id uuid → tags.id,
--             primary key (user_id, tag_id))

alter table public.user_tag enable row level security;


-- 書き: 自分の行だけ ---------------------------------------------------------
--
-- select (user_tag_select_authenticated) は誰のタグでも読めるが、書けるのは
-- 自分の行だけ。post_tags_write と同じ考え方で、持ち主の判定を行の列
-- (user_id) で行う。
--
-- update は作らない。user_tag は (user_id, tag_id) の2列しか無く、
-- どちらも主キーの構成列なので「行を書き換える」意味が無い。
-- 付け外しは insert と delete で足りる。
--
-- insert には with check (書き込む行が条件を満たすか) だけを、
-- delete には using (既存行を触れるか) だけを置く。insert に using は
-- 効かず、delete に with check は効かないため、for all で両方に同じ条件を
-- 置く書き方 (post_tags_write) をあえて分けている。
--
-- tag_id 側は検証しない。tags は行に持ち主がいない共有マスタで、
-- 外部キー (user_tag_tag_id_fkey) が存在しない tag_id を既に弾く。

drop policy if exists user_tag_insert_own on public.user_tag;

create policy user_tag_insert_own on public.user_tag
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_tag_delete_own on public.user_tag;

create policy user_tag_delete_own on public.user_tag
  for delete to authenticated
  using (user_id = auth.uid());


-- 索引 -----------------------------------------------------------------------
--
-- 追加するものは無い。保存時の delete は
--   where user_id = ? and tag_id in (...)
-- で引くので、(user_id, tag_id) の主キー索引がそのまま効く。
