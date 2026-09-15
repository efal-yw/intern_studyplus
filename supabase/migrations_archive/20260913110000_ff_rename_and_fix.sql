-- ff (フォロー関係) まわりの整理。次の3つをまとめて行う。
--
--   1. カラム名を from_user_id / to_user_id に変える
--   2. rename に追随しない関数の本体を書き直す
--   3. insert / delete ポリシーの向きを直す
--
-- カラムの rename はダッシュボードで手作業済みで、migrations/ には記録が無い
-- 状態から流すことを想定している。そのため全体を冪等に書いてある。
-- (rename 済みの列にもう一度 rename をかけると push がそこで止まり、
--  以降のマイグレーションが1本も適用されない)
--
-- 用語の定義。DB 全体でこの向きに統一する:
--   from_user_id = フォローする側
--   to_user_id   = フォローされる側


-- 1. カラム名 -------------------------------------------------------------
-- 元の follower_id / followee_id は -er と -ee の差しかなく、書くたびに
-- どちらがどちらか迷う。実際に関数とポリシーが別々の解釈で書かれていた。
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ff' and column_name = 'follower_id'
  ) then
    alter table public.ff rename column follower_id to from_user_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ff' and column_name = 'followee_id'
  ) then
    alter table public.ff rename column followee_id to to_user_id;
  end if;
end $$;

-- 外部キーの制約名は rename に追随しないので、ff_follower_id_fkey /
-- ff_followee_id_fkey という古い名前のまま残る。実害は無いので触らない。


-- 2. 制約 -----------------------------------------------------------------
-- 同じ相手を二重にフォローできないようにする。フォローのトグルは
-- 「重複エラー(23505)なら既にフォロー済み = 成功」として連打を吸収するので、
-- この一意制約が無いと連打で行が増える。(likes の likes_unique と同じ考え方)
create unique index if not exists ff_from_to_unique
  on public.ff (from_user_id, to_user_id);

-- 自分で自分をフォローできないようにする。
-- サーバーアクション側でも弾いているが、UI を通らない POST も届くのでDBでも縛る。
alter table public.ff drop constraint if exists ff_no_self_follow;
alter table public.ff
  add constraint ff_no_self_follow check (from_user_id <> to_user_id);


-- 3. 関数 -----------------------------------------------------------------
-- ポリシーとビューは解析済みの依存として rename に自動追随するが、
-- 【関数の本体は追随しない】。テキストとして保存されているだけだからで、
-- 放っておくと can_view_post() が "column f.followee_id does not exist" で落ち、
-- これを RLS(select) に使っている posts / likes / comments が全部見えなくなる。

-- 投稿を見てよいか。visibility = 'ff' のとき「投稿者をフォローしているか」を見る。
create or replace function public.can_view_post(p_post_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.posts p
    where p.post_id = p_post_id
      and (
            p.user_id = auth.uid()                       -- 自分の投稿
         or p.visibility = 'public'                      -- 全体公開
         or ( p.visibility = 'ff'
              and exists (                               -- 投稿者をフォローしている
                select 1 from public.ff f
                where f.to_user_id = p.user_id
                  and f.from_user_id = auth.uid()
              ))
      )
  );
$function$;

-- ff の増減に合わせて users.follower_count / following_count を更新する。
-- トリガー本体は既存のものをそのまま使う (列名だけ差し替え)。
create or replace function public.sync_ff_counts()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if (tg_op = 'INSERT') then
    update public.users set follower_count  = follower_count  + 1 where id = new.to_user_id;
    update public.users set following_count = following_count + 1 where id = new.from_user_id;
    return new;

  elsif (tg_op = 'DELETE') then
    update public.users set follower_count  = greatest(follower_count  - 1, 0) where id = old.to_user_id;
    update public.users set following_count = greatest(following_count - 1, 0) where id = old.from_user_id;
    return old;

  elsif (tg_op = 'UPDATE') then
    -- フォロー関係の張り替え（通常は起きないが念のため）
    if (old.to_user_id is distinct from new.to_user_id) then
      update public.users set follower_count = greatest(follower_count - 1, 0) where id = old.to_user_id;
      update public.users set follower_count = follower_count + 1              where id = new.to_user_id;
    end if;
    if (old.from_user_id is distinct from new.from_user_id) then
      update public.users set following_count = greatest(following_count - 1, 0) where id = old.from_user_id;
      update public.users set following_count = following_count + 1              where id = new.from_user_id;
    end if;
    return new;
  end if;

  return null;
end;
$function$;

-- 数え直し用。
create or replace function public.recount_ff_counts()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.users u
  set follower_count  = (select count(*) from public.ff where to_user_id   = u.id),
      following_count = (select count(*) from public.ff where from_user_id = u.id);
$function$;


-- 4. ポリシー -------------------------------------------------------------
-- 元の ff_insert_self は with_check が (followee_id = auth.uid())、つまり
-- 「自分がフォローされる側の行だけ作れる」になっていた。これだと
--   ・自分は誰もフォローできない            → insert が 42501 で弾かれる
--   ・代わりに他人を勝手に自分のフォロワーにできる
-- という状態になる。can_view_post() と sync_ff_counts() は両方とも
-- 「to_user_id = フォローされる側」で書かれているので、関数側に合わせる。
alter table public.ff enable row level security;

-- フォローできるのは「自分から」の行だけ。
drop policy if exists ff_insert_self on public.ff;
create policy ff_insert_self on public.ff
  for insert to authenticated
  with check (from_user_id = auth.uid());

-- 解除できるのも「自分から」の行だけ。
-- ※ 元の (to_user_id = auth.uid()) は「自分のフォロワーを外す」機能としては
--   成立するが、insert が明らかに逆である以上、同じ取り違えとみなして揃える。
--   フォロワー削除が欲しくなったら、別ポリシーとして意図的に足すこと。
drop policy if exists ff_delete_self on public.ff;
create policy ff_delete_self on public.ff
  for delete to authenticated
  using (from_user_id = auth.uid());

-- 読み取りは全員に開いたまま (ff_select_all = qual true)。無ければ作る。
drop policy if exists ff_select_all on public.ff;
create policy ff_select_all on public.ff
  for select to authenticated
  using (true);


-- 5. 数え直し -------------------------------------------------------------
-- rename 後、sync_ff_counts() が古い列名を参照して ff への insert / delete が
-- 全部失敗していた期間があるので、実際の行数と表示値をそろえ直す。
select public.recount_ff_counts();
