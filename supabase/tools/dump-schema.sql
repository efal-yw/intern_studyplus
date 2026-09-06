supabase/migrations/-- ===========================================================================
-- 現在のスキーマ（型・テーブル・制約・インデックス・関数・トリガー・RLS）を
-- CREATE 文として書き出す。
--
-- 使い方:
--   Supabase ダッシュボード → SQL Editor に貼って実行し、
--   結果のセルをコピーして supabase/migrations/ のファイルに貼る。
--
-- なぜこれが要るか:
--   `supabase db pull` は Docker Desktop（またはDockerデーモン）を必要とする。
--   Docker を入れずにスキーマをリポジトリに取り込むための代替手段。
--
-- 注意:
--   public スキーマのみが対象。auth / storage スキーマは Supabase の管理領域なので含めない。
-- ===========================================================================

with
enums as (
  select
    1 as ord, t.typname as sort_name, 0 as sort_sub,
    'create type public.' || quote_ident(t.typname) || ' as enum ('
      || (select string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder)
            from pg_enum e where e.enumtypid = t.oid)
      || ');' as ddl
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
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
      || E'\n);' as ddl
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname
),
constraints as (
  select
    3 as ord, c.relname as sort_name,
    case con.contype when 'p' then 1 when 'u' then 2 when 'c' then 3 else 4 end as sort_sub,
    'alter table public.' || quote_ident(c.relname)
      || ' add constraint ' || quote_ident(con.conname) || ' '
      || pg_get_constraintdef(con.oid) || ';' as ddl
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
indexes as (
  select 4 as ord, i.tablename as sort_name, 0 as sort_sub, i.indexdef || ';' as ddl
  from pg_indexes i
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
         pg_get_functiondef(p.oid) || ';' as ddl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
),
triggers as (
  select 6 as ord, c.relname as sort_name, 0 as sort_sub,
         pg_get_triggerdef(t.oid) || ';' as ddl
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
rls as (
  select 7 as ord, c.relname as sort_name, 0 as sort_sub,
         'alter table public.' || quote_ident(c.relname)
           || ' enable row level security;' as ddl
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
),
policies as (
  select 8 as ord, p.tablename as sort_name, 0 as sort_sub,
    'create policy ' || quote_ident(p.policyname)
      || ' on public.' || quote_ident(p.tablename)
      || ' as ' || p.permissive
      || ' for ' || p.cmd
      || ' to ' || array_to_string(p.roles, ', ')
      || coalesce(E'\n  using (' || p.qual || ')', '')
      || coalesce(E'\n  with check (' || p.with_check || ')', '')
      || ';' as ddl
  from pg_policies p
  where p.schemaname = 'public'
),
all_ddl as (
  select * from enums
  union all select * from tables
  union all select * from constraints
  union all select * from indexes
  union all select * from functions
  union all select * from triggers
  union all select * from rls
  union all select * from policies
)
-- 1セルにまとめて出す（コピーしやすい）
select string_agg(ddl, E'\n\n' order by ord, sort_name, sort_sub) as schema_sql
from all_ddl;

-- セルが長すぎて途中で切れる場合は、上の select を消して代わりにこちらを使う:
--   select ord, sort_name, ddl from all_ddl order by ord, sort_name, sort_sub;
