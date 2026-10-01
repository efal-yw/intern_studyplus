-- user_tag の一意制約を user_id 単独から (user_id, tag_id) の複合に変える。
--
-- なぜ:
--   user_tag は「ユーザーとタグの中間テーブル」なのに、user_id 側に単独の
--   一意制約が付いていて、1ユーザーにつき1件しか行を持てなかった。
--   lib/database.types.ts の外部キー定義に
--     foreignKeyName: "user_tag_user_id_fkey" / isOneToOne: true
--   として現れている。
--
--   app/mypage/user_tags.tsx は複数タグを map で並べる作りなので、
--   2件目を insert した時点で一意制約違反になって入らない。
--   中間テーブルとして正しい形は「同じ組み合わせが二重に入らない」であって、
--   「1ユーザー1行」ではない。
--
-- このテーブルもダッシュボードで直接作られていてマイグレーションが無い
-- (20260916013127_tags_rls_policies.sql の tags / post_tags と同じ)。
-- なので create table は書かず、制約の付け替えだけを担当する。
--
-- 冪等に書く。ローカルDBが無く本番に直接流すため、途中で落ちても
-- 同じファイルを流し直せるようにしておく。


-- 1. user_id 単独の一意制約を外す --------------------------------------------
--
-- 制約が PRIMARY KEY なのか UNIQUE なのか、また名前が何なのかは
-- lib/database.types.ts からは分からない (isOneToOne: true としか出ない)。
-- 名前を決め打ちで drop すると外れずに後続が失敗するので、
-- 「対象列がちょうど user_id の1列だけ」の主キー/一意制約を探して落とす。
--
-- conkey は列番号の配列。これが user_id の attnum 1件と完全一致する
-- ものだけを対象にする。(user_id, tag_id) の複合は2要素なので当たらない
-- = このファイルを流し直しても2回目は何もしない。

do $$
declare
  target record;
begin
  for target in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.user_tag'::regclass
      and con.contype in ('p', 'u')
      and con.conkey = array[
        (
          select att.attnum
          from pg_attribute att
          where att.attrelid = con.conrelid
            and att.attname = 'user_id'
        )
      ]::smallint[]
  loop
    execute format(
      'alter table public.user_tag drop constraint %I', target.conname
    );
    raise notice 'dropped constraint %', target.conname;
  end loop;
end
$$;


-- 2. tag_id を not null にする -----------------------------------------------
--
-- 複合主キーにする列なので null は許せない。そもそもタグを指していない
-- user_tag の行には意味が無い。
--
-- 【null が残っていればここで止まる】。20260919111843_tags_name_not_null.sql
-- と同じ方針で、勝手に行を消して通すより止まって気付けるほうがよい。
-- その場合は中身を見て、タグを割り当てるか行を消してから流し直すこと。
--   select * from public.user_tag where tag_id is null;

do $$
declare
  orphan_count bigint;
begin
  select count(*) into orphan_count
  from public.user_tag
  where tag_id is null;

  if orphan_count > 0 then
    raise exception
      'user_tag に tag_id が null の行が %件ある。'
      '中身を確認して、タグを割り当てるか行を削除してから流し直すこと。',
      orphan_count;
  end if;
end
$$;

alter table public.user_tag
  alter column tag_id set not null;


-- 3. (user_id, tag_id) を主キーにする ----------------------------------------
--
-- unique 制約ではなく主キーにするのは、1 で主キーごと落ちている可能性が
-- あるため。主キーの無いテーブルは Supabase のリアルタイムや
-- 行の特定を伴う操作で扱いが面倒になる。
--
-- 中間テーブルの主キーを (親, 子) の複合にするのは定石で、
-- 「同じユーザーに同じタグを二重に付けられない」もこれで担保される。

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_tag'::regclass
      and contype = 'p'
  ) then
    alter table public.user_tag
      add constraint user_tag_pkey primary key (user_id, tag_id);
  end if;
end
$$;


-- 4. tag_id 側の索引 ----------------------------------------------------------
--
-- 主キーの索引は (user_id, tag_id) の順なので「このユーザーのタグ一覧」には
-- 効くが、「このタグを付けているユーザー一覧」には先頭列が違うため効かない。
-- post_tags_tag_id_idx と同じ理由で明示的に張る。

create index if not exists user_tag_tag_id_idx on public.user_tag (tag_id);
