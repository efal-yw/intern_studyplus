-- 同じことを二度やっている制約・インデックス・ポリシーを整理する。
--
-- 動作は今も正しい。ただし ff は書き込みのたびに一意制約2本ぶんの
-- インデックス更新と CHECK 2回を通っていて、
-- 「どれが正なのか」が後から読んで分からない状態になっている。
--
-- 消すだけなので冪等。if exists を付けてあるので流し直せる。


-- 1. 自己フォロー禁止の CHECK が2本 -------------------------------------------
-- ff_no_self と ff_no_self_follow は述語まで完全に同じ。
--   CHECK (from_user_id <> to_user_id)
-- 名前が具体的な ff_no_self_follow を残す。
alter table public.ff drop constraint if exists ff_no_self;


-- 2. 同じ2列の一意性が制約とインデックスで二重 --------------------------------
-- ff_unique (UNIQUE 制約) と ff_from_to_unique (UNIQUE INDEX) が
-- どちらも (from_user_id, to_user_id) を張っていて、実体のインデックスが2本ある。
--
-- 残すのは ff_from_to_unique のほう。
-- アプリ側 (app/users/followActions.ts) が重複フォローの握り潰しを
-- 「ff_from_to_unique がある」という前提でコメントに書いているため、
-- そちらの名前を正とする。
--
-- 制約を落とすと、制約が持っていたインデックスも一緒に消える。
alter table public.ff drop constraint if exists ff_unique;


-- 3. 冗長なインデックスと、名前が中身と逆のインデックス ------------------------
-- idx_ff_followee は from_user_id 単独。ff_from_to_unique が
-- (from_user_id, to_user_id) を張っているので、from_user_id だけの検索も
-- そちらの先頭列で効く。持っているだけ無駄。
drop index if exists public.idx_ff_followee;

-- idx_ff_follower は to_user_id に張られている。
-- ff_rename_and_fix (書庫) で列名を from / to に統一したのは
-- 「-er と -ee の差しかなく毎回どちらか迷う」からだったのに、
-- インデックス名だけ古い語彙のまま残り、しかも逆の意味で付いていた。
-- 列名に合わせる。
alter index if exists public.idx_ff_follower rename to idx_ff_to_user_id;


-- 4. 同じ述語の DELETE ポリシーが2本 -------------------------------------------
-- posts_delete_own (to authenticated) と posts_delete_self (to public) は
-- どちらも using (user_id = auth.uid())。
--
-- 締まっている authenticated 側を残す。
-- anon は auth.uid() が null で1行も対象にならないため、挙動は変わらない。
drop policy if exists posts_delete_self on public.posts;
