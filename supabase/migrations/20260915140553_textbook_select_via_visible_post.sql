-- 他人の記録投稿でも教材名が見えるようにする。
--
-- 症状:
--   タイムラインの記録投稿は app/timeline/components/record.tsx が
--   textbook を id で引いて名前を出している。しかし textbook の SELECT
--   ポリシーは「自分の教材だけ」なので、他人の投稿では0行が返り、
--   教材名の欄が常に空になっていた (コンソールには textbook fetch failed)。
--
-- 方針:
--   「その投稿が見える人には、その投稿が使っている教材の名前も見える」。
--   投稿本体が見えるのに教材名だけ伏せる意味は無い。
--
-- 既存の「自分の教材だけ」ポリシーは残す。RLS の permissive ポリシーは
-- OR で足し合わされるので、
--   自分の教材 (投稿に使っていないものも含む) ∪ 見える投稿が使っている教材
-- が読めるようになる。教材一覧 (app/record/page.tsx) は user_id で
-- 絞っているので、他人の教材が一覧に混ざることはない。
--
-- 公開範囲が広がる点:
--   visibility='public' の記録投稿に使った教材は、その投稿を見られる人
--   全員に名前が見える。教材名は投稿の一部として表示される情報なので
--   意図どおり。逆に、投稿に使っていない教材は誰にも見えないまま。


-- 再帰しないことの確認:
--   このポリシーは textbook → post_record → (can_view_post) → posts の向き。
--   can_view_post が読むのは posts と ff だけで textbook を読まないため、
--   ポリシーが自分自身を呼び戻すことはない。
--   (posts 自身のポリシーで can_view_post を使えないのとは事情が違う。
--    理由は 20260915134053 のコメントを参照)
drop policy if exists textbook_select_via_visible_post on public.textbook;

create policy textbook_select_via_visible_post on public.textbook
  for select to authenticated
  using (
    exists (
      select 1
      from public.post_record pr
      where pr.textbook = textbook.id
        and public.can_view_post(pr.post_id)
    )
  );


-- post_record.textbook に索引が無いと、このポリシーの exists が
-- 投稿数ぶんの逐次走査になる。教材1件ごとに引かれるので効いてくる。
create index if not exists idx_post_record_textbook
  on public.post_record (textbook);
