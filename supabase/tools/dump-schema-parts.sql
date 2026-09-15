-- ベースライン用。1本ずつ順番に実行して、結果をつなげる。
-- 大きい1本(dump-schema.sql)が通らない環境向けの分割版。
-- 実行順に貼ると、そのままマイグレーション1本になる。

-- ===== 1/6 enum =====
select 'create type public.' || t.typname || ' as enum (' ||
       string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder) || ');' as ddl
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'public'
group by t.typname
order by t.typname;

-- ===== 2/6 table =====
select 'create table public.' || c.relname || ' (' ||
       string_agg('  ' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod) ||
                  coalesce(' default ' || pg_get_expr(ad.adbin, ad.adrelid), '') ||
                  case when a.attnotnull then ' not null' else '' end,
                  ', ' order by a.attnum) || ');' as ddl
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname
order by c.relname;

-- ===== 3/6 constraint =====
select 'alter table public.' || c.relname || ' add constraint ' || con.conname || ' ' ||
       pg_get_constraintdef(con.oid) || ';' as ddl
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, con.conname;

-- ===== 4/6 function + 権限(acl列を見る) =====
select pg_get_functiondef(p.oid) || ';' as ddl,
       coalesce(array_to_string(p.proacl, ' | '), 'default (PUBLIC has EXECUTE)') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind in ('f', 'p')
order by p.proname;

-- ===== 5/6 trigger (auth.users 込み) =====
select pg_get_triggerdef(t.oid) || ';' as ddl
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc fp on fp.oid = t.tgfoid
join pg_namespace fn on fn.oid = fp.pronamespace
where not t.tgisinternal and (n.nspname = 'public' or fn.nspname = 'public')
order by 1;

-- ===== 6/6 policy (storage 込み) =====
select 'create policy ' || quote_ident(policyname) || ' on ' || schemaname || '.' || tablename ||
       ' as ' || permissive || ' for ' || cmd || ' to ' || array_to_string(roles, ', ') ||
       coalesce(' using (' || qual || ')', '') ||
       coalesce(' with check (' || with_check || ')', '') || ';' as ddl
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
