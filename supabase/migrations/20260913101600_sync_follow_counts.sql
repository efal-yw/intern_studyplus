-- users.following_count / follower_count を ff の増減に合わせて更新する。
--
-- アプリ側はこの2カラムを表示するだけで、どこからも書いていない
-- (grep して確認済み: app/mypage/page.tsx と app/users/[id]/page.tsx の select のみ)。
-- 誰かが書かないと永久に初期値のままなので、DB 側のトリガーで持つ。
--
-- ※ 適用前に、既に同じ役割のトリガーが ff に付いていないか確認すること。
--   付いたまま足すと2重に加算される。ダッシュボードの SQL Editor で:
--     select tgname from pg_trigger
--     where tgrelid = 'public.ff'::regclass and not tgisinternal;
create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.users
      set following_count = coalesce(following_count, 0) + 1
      where id = new.from_user_id;

    update public.users
      set follower_count = coalesce(follower_count, 0) + 1
      where id = new.to_user_id;

  elsif (tg_op = 'DELETE') then
    -- greatest(..., 0) は保険。ズレても負の数を表示しないようにする。
    update public.users
      set following_count = greatest(coalesce(following_count, 1) - 1, 0)
      where id = old.from_user_id;

    update public.users
      set follower_count = greatest(coalesce(follower_count, 1) - 1, 0)
      where id = old.to_user_id;
  end if;

  return null;
end;
$$;

drop trigger if exists ff_sync_counts on public.ff;
create trigger ff_sync_counts
  after insert or delete on public.ff
  for each row execute function public.sync_follow_counts();

-- トリガーが無かった期間のぶん、既存の行数と表示値をここで一度そろえる。
update public.users u set
  following_count = (select count(*) from public.ff where from_user_id = u.id),
  follower_count  = (select count(*) from public.ff where to_user_id   = u.id);
