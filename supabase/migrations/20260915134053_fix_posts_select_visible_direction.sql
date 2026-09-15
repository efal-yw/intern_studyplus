-- posts の SELECT ポリシーだけ ff の向きが逆だったのを直す。
--
-- 仕様: 「自分がフォローしている相手」の ff 投稿が見える。
--   from_user_id = フォローする側 / to_user_id = フォローされる側
--   なので、閲覧者が auth.uid() = from_user_id 側に立つのが正しい。
--
-- 直す前の posts_select_visible はこう書かれていた:
--     f.from_user_id = posts.user_id and f.to_user_id = auth.uid()
--   = 「投稿者が閲覧者をフォローしている」= 逆向き。
--
-- can_view_post() は最初から正しい向きで書かれていて、comments / likes /
-- post_ask / post_knowledge / post_record と storage.objects のポリシーは
-- 全部そちらを経由している。つまり posts 本体だけが別の解釈で動いていた。
--
-- 実害: visibility='ff' の投稿について
--   ・投稿者がフォローしている人 → 本体は見えるがコメントもいいねも見えない
--   ・投稿者をフォローしている人 → 本体が見えないのに中身は見える権利がある
--   タイムラインと詳細で見え方が食い違う。
--
-- ff_rename_and_fix (書庫) が潰したはずの「関数とポリシーが別解釈」が
-- ここ1箇所だけ生き残っていた。


-- なぜ can_view_post(post_id) を呼ぶ形にしないか ------------------------------
--
-- 他のテーブルのように `using (public.can_view_post(post_id))` と書けば
-- 定義が1箇所になって二度と食い違わない。が、posts では【できない】。
--
-- can_view_post は中で public.posts を select する。それを posts 自身の
-- SELECT ポリシーから呼ぶと、ポリシー → 関数 → posts → ポリシー … と回り、
-- Postgres に "infinite recursion detected in policy for relation posts"
-- で止められる（SECURITY DEFINER でも、実行ロールが BYPASSRLS を
-- 持っていなければ RLS は再適用される）。
--
-- なので posts だけは同じ条件をインラインで持つ。
-- 【可視範囲を変えるときは can_view_post とこのポリシーの両方を直すこと。】
-- 片方だけ直すと、今回と同じ食い違いがまた出る。


-- 冪等に書く。ローカルDBが無く本番に直接流すため、
-- 途中で落ちても同じファイルを流し直せるようにしておく。
drop policy if exists posts_select_visible on public.posts;

-- 対象ロールは元のまま `public` にしてある（anon を含む）。
-- visibility='public' の投稿が未ログインでも読めるのは既存の挙動で、
-- ここはその是非を判断する場所ではないため変えない。
create policy posts_select_visible on public.posts
  for select to public
  using (
    -- 自分の投稿
    user_id = auth.uid()

    -- 全体公開
    or visibility = 'public'::visibility_scope

    -- フォローしている相手の ff 投稿
    or (
      visibility = 'ff'::visibility_scope
      and exists (
        select 1
        from public.ff f
        where f.to_user_id = posts.user_id   -- フォローされている側 = 投稿者
          and f.from_user_id = auth.uid()    -- フォローしている側 = 閲覧者
      )
    )
  );
