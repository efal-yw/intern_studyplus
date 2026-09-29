-- 教材アイコンを「public バケット + 推測不能パス」で配る。
--
-- 方針:
--   画像のバイト列そのものは守らない。URL を知っていれば誰でも取れる代わりに、
--   ファイル名に uuid を入れて推測できないようにする。守るべき「誰がいつ何を
--   勉強したか」は posts の RLS が引き続き守る。
--   (投稿画像 = posts バケットは本文そのものが写るので private + 署名URLのまま。
--    アイコンとは強度を変えている)
--
--   この判断の結果、icons テーブルの RLS は「見せない」ためではなく
--   「書き換えさせない」ために使う。
--
-- パスの決まり (バケット textbook_icons の中):
--   shared/<uuid>.webp      … プリセット。全員が選べる
--   <user_id>/<uuid>.webp   … ユーザーがアップロードしたもの
--   1段目で持ち主を判定する。icons.icon_path にはこの「バケット内のパス」を入れ、
--   バケット名は入れない (ポリシーの prefix 一致を素直に書くため)。


-- 1. バケットを public 読みにする ---------------------------------------------
-- public = true が効くのは読みだけ。insert / update / delete は下のポリシーが要る。
-- file_size_limit / allowed_mime_types は必ず入れる。このアップロードはブラウザから
-- Storage へ直接飛ぶのでサーバー側で検証する余地がなく、UI を通らない経路に
-- 効くのはバケット設定だけ。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('textbook_icons', 'textbook_icons', true, 307200, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- 2. storage のポリシー --------------------------------------------------------
-- 読みはポリシー不要 (public バケット)。書き込みだけを自分のフォルダに限定する。
-- shared/ 配下は誰も書けない = プリセットはダッシュボード (service role) から入れる。

-- private 前提で書いていたポリシーが残っていたら落とす
drop policy if exists textbook_icons_select_visible on storage.objects;

drop policy if exists textbook_icons_insert_own on storage.objects;
create policy textbook_icons_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'textbook_icons'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists textbook_icons_update_own on storage.objects;
create policy textbook_icons_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'textbook_icons'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'textbook_icons'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists textbook_icons_delete_own on storage.objects;
create policy textbook_icons_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'textbook_icons'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- 3. icons のポリシー ----------------------------------------------------------
alter table public.icons enable row level security;

-- 読みは全員に開ける。
-- 行を隠しても画像は public バケットから取れるので防御にならず、隠すと
-- 他人の投稿で教材アイコンが出なくなる (textbook からの埋め込みが null になる)。
-- 「プリセットか自分のか」の絞り込みは、アイコン選択UIのクエリ側でやる。
drop policy if exists icons_select_authenticated on public.icons;
create policy icons_select_authenticated on public.icons
  for select to authenticated
  using (true);

-- 書きは自分の prefix のパスだけ。
-- uuid にはワイルドカード文字 (% _) が含まれないので like の前方一致で判定できる。
-- shared/ を指す行はここを通らない = ユーザーが「全員向け」を偽装して増やせない。
drop policy if exists icons_insert_own on public.icons;
create policy icons_insert_own on public.icons
  for insert to authenticated
  with check (icon_path like auth.uid()::text || '/%');

drop policy if exists icons_update_own on public.icons;
create policy icons_update_own on public.icons
  for update to authenticated
  using (icon_path like auth.uid()::text || '/%')
  with check (icon_path like auth.uid()::text || '/%');

drop policy if exists icons_delete_own on public.icons;
create policy icons_delete_own on public.icons
  for delete to authenticated
  using (icon_path like auth.uid()::text || '/%');
