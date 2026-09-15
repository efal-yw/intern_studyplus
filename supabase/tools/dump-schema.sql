-- ===========================================================================
-- 現在のスキーマを CREATE 文として書き出す（v2）。
--
-- 使い方:
--   Supabase ダッシュボード → SQL Editor に【全文】貼って実行し、
--   結果のセルをコピーして supabase/migrations/ のファイルに貼る。
--
-- v1 からの変更点:
--
--   1. 文字列リテラルの中からセミコロンを追放した。
--      v1 は `|| ';' as ddl` と書いていたため、SQLを「;」で機械的に区切る
--      ツールに通すとクエリが途中でぶつ切りになり、断片が単独で実行されて
--      意味不明なエラーになる。ここでは chr(59) で組み立てるので、
--      ファイル全体でセミコロンは【末尾の1個だけ】になる。
--
--   2. auth / storage を拾うようにした。
--      v1 は public スキーマだけが対象で、次の2つが漏れていた。
--        ・auth.users の on_auth_user_created トリガー
--        ・storage.objects のポリシー（can_view_post を参照している）
--      どちらもこのアプリの権限設計の本体なので、拾わないと
--      ベースラインが片肺になる。
--
--   3. 関数の EXECUTE 権限を出すようにした。
--      Supabase は public スキーマの関数を PostgREST の RPC として自動で開く。
--      「どの関数が誰に開いているか」はセキュリティ上の設定なので記録する。
--
-- 注意:
--   pg_get_triggerdef はスキーマ修飾なしの関数名を返すことがある
--   （EXECUTE FUNCTION handle_new_auth_user() のように）。流し直すときは
--   search_path に public が入っている必要がある。
--
--   auth / storage スキーマの【テーブル定義そのもの】は Supabase の管理領域
--   なので出力しない。出すのは「こちらが足したトリガーとポリシー」だけ。
--   Storage のバケット設定（public/private・allowed_mime_types・
--   file_size_limit）は SQL では取れないので、ダッシュボードが唯一の正。
-- ===========================================================================

with
-- セミコロン。文字列リテラルに直接書かないための逃げ道
eos as (select chr(59) as s),

enums as (
  select
    1 as ord, t.typname as sort_name, 0 as sort_sub,
    'create type public.' || quote_ident(t.typname) || ' as enum ('
      || (select string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder)
            from pg_enum e where e.enumtypid = t.oid)
      || ')' || eos.s as ddl
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  cross join eos
  where n.nspname = 'public' and t.typtype = 'e'
),

tables as (
  select
    2 as ord, c.relname as sort_name, 0 as sort_sub,
    'create table public.' || quote_ident(c.relname) || E' (\n'
      || string_agg(
           '  ' || quote_ident(a.attname) || ' ' || format_type(a.atttypid, a.atttypmod)
           || case
                when a.attidentity <> '' then ' generated '
                     || case a.attidentity when 'a' then 'always' else 'by default' end
                     || ' as identity'
                when ad.adbin is not null then ' default ' || pg_get_expr(ad.adbin, ad.adrelid)
                else ''
              end
           || case when a.attnotnull then ' not null' else '' end,
           E',\n' order by a.attnum)
      || E'\n)' || min(eos.s) as ddl
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
  cross join eos
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname
),

constraints as (
  select
    3 as ord, c.relname as sort_name,
    case con.contype when 'p' then 1 when 'u' then 2 when 'c' then 3 else 4 end as sort_sub,
    'alter table public.' || quote_ident(c.relname)
      || ' add constraint ' || quote_ident(con.conname) || ' '
      || pg_get_constraintdef(con.oid) || eos.s as ddl
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  cross join eos
  where n.nspname = 'public'
),

indexes as (
  select 4 as ord, i.tablename as sort_name, 0 as sort_sub,
         i.indexdef || eos.s as ddl
  from pg_indexes i
  cross join eos
  where i.schemaname = 'public'
    and not exists (
      select 1
      from pg_constraint con
      join pg_class ic on ic.oid = con.conindid
      join pg_namespace inn on inn.oid = ic.relnamespace
      where inn.nspname = i.schemaname and ic.relname = i.indexname
    )
),

functions as (
  select 5 as ord, p.proname as sort_name, 0 as sort_sub,
         pg_get_functiondef(p.oid) || eos.s as ddl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join eos
  where n.nspname = 'public' and p.prokind in ('f', 'p')
),

-- 関数の EXECUTE 権限。
-- proacl が null = 「一度も grant/revoke していない」= Postgres の既定で
-- PUBLIC に EXECUTE が付いている状態。RPC として全開なので、そうと分かるように出す。
function_grants as (
  select 6 as ord, p.proname as sort_name, 0 as sort_sub,
    case
      when p.proacl is null then
        '-- public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
          || ' : EXECUTE は既定のまま（PUBLIC に付与済み）'
          || case when p.prorettype = 'trigger'::regtype
                  then '。トリガー関数なので RPC からは呼べない'
                  else '。RPC として全開なので、意図した状態か確認すること' end
      else
        'grant execute on function public.' || quote_ident(p.proname)
          || '(' || pg_get_function_identity_arguments(p.oid) || ') to '
          || (select string_agg(
                       case when a.grantee = 0 then 'public'
                            else a.grantee::regrole::text end,
                       ', ')
                from aclexplode(p.proacl) a
                where a.privilege_type = 'EXECUTE')
          || eos.s
    end as ddl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join eos
  where n.nspname = 'public' and p.prokind in ('f', 'p')
),

-- トリガー。public のテーブルにあるものに加えて、
-- 「他スキーマのテーブルにあるが public の関数を呼ぶもの」も拾う。
-- auth.users の on_auth_user_created がこれに当たる。
triggers as (
  select 7 as ord, c.relname as sort_name, 0 as sort_sub,
         pg_get_triggerdef(t.oid) || eos.s as ddl
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc fp on fp.oid = t.tgfoid
  join pg_namespace fn on fn.oid = fp.pronamespace
  cross join eos
  where not t.tgisinternal
    and (n.nspname = 'public' or fn.nspname = 'public')
),

rls as (
  select 8 as ord, c.relname as sort_name, 0 as sort_sub,
         'alter table ' || quote_ident(n.nspname) || '.' || quote_ident(c.relname)
           || ' enable row level security' || eos.s as ddl
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join eos
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
),

-- ポリシーは storage も対象にする。投稿画像の公開範囲は
-- storage.objects のポリシーが担っているため。
policies as (
  select 9 as ord, p.schemaname || '.' || p.tablename as sort_name, 0 as sort_sub,
    'create policy ' || quote_ident(p.policyname)
      || ' on ' || quote_ident(p.schemaname) || '.' || quote_ident(p.tablename)
      || ' as ' || p.permissive
      || ' for ' || p.cmd
      || ' to ' || array_to_string(p.roles, ', ')
      || coalesce(E'\n  using (' || p.qual || ')', '')
      || coalesce(E'\n  with check (' || p.with_check || ')', '')
      || eos.s as ddl
  from pg_policies p
  cross join eos
  where p.schemaname in ('public', 'storage')
),

all_ddl as (
  select * from enums
  union all select * from tables
  union all select * from constraints
  union all select * from indexes
  union all select * from functions
  union all select * from function_grants
  union all select * from triggers
  union all select * from rls
  union all select * from policies
)

-- 1セルにまとめて出す（コピーしやすい）。
-- セルが長すぎて途中で切れる場合は、この select を
--   select ord, sort_name, ddl from all_ddl order by ord, sort_name, sort_sub
-- に差し替えて、1行ずつコピーする。
select string_agg(ddl, E'\n\n' order by ord, sort_name, sort_sub) as schema_sql
from all_ddl;
