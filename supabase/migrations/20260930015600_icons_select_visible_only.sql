-- icons の読み取りを「見てよい行」だけに絞る。
--
-- なぜ:
--   20260929223639 では icons の select を authenticated 全員に開けていた
--   (using (true))。画面側 (AddTextbook.tsx) は .or() でプリセットと自分の分に
--   絞っていたが、それはアプリの中だけの話で、PostgREST を直接叩けば
--   全員分の icon_path と name が取れた。
--
--   - icon_path が全部見える → 「uuid で推測できないパス」という守りが崩れる
--   - name には教材名が入る (insertIconRow が教材と同じ名前を付ける)
--     → textbook_select_via_visible_post で隠している教材名が、横から漏れる
--
-- 見てよい行:
--   1. プリセット (shared/)            … 全員が選べる
--   2. 自分がアップロードしたもの       … 持ち主
--   3. 自分に見える教材が使っているもの … 他人の投稿で教材アイコンを出すため
--
-- 3 の exists は textbook を読むので、textbook の RLS (持ち主 or
-- 見える投稿が使っている教材) がそのまま効く。
-- 「教材名が見える人にはアイコンも見える / 見えない人には両方見えない」が揃う。
-- 再帰しない: textbook のポリシーも can_view_post も icons を読まない。

drop policy if exists icons_select_authenticated on public.icons;
drop policy if exists icons_select_visible on public.icons;

create policy icons_select_visible on public.icons
  for select to authenticated
  using (
    icon_path like 'shared/%'
    or icon_path like auth.uid()::text || '/%'
    or exists (
      select 1
      from public.textbook t
      where t.icon = icons.id
    )
  );

-- 上の exists と、textbook から icons への埋め込みが使う索引
create index if not exists idx_textbook_icon on public.textbook (icon);
