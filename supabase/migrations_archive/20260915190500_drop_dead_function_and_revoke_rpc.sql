-- 使われていない関数の削除と、RPC として開いている関数の締め。
--
-- 現物を pg_trigger / pg_policy で確認した結果に基づく。
--
--   can_view_post(uuid)     ポリシー8本から参照   → そのまま
--   sync_ff_counts()        ff のトリガー3本から  → そのまま
--   handle_new_auth_user()  on_auth_user_created  → そのまま
--   handle_new_user()       参照 0                → 削除 (このファイル)
--   recount_ff_counts()     参照 0                → 残すが RPC を閉じる (このファイル)


-- 1. handle_new_user() の削除 --------------------------------------------
-- on_auth_user_created が呼んでいるのは handle_new_auth_user() のほうだと
-- 確認済み。handle_new_user() はトリガーからもポリシーからも参照が無く、
-- アプリのコードにも一度も出てこない。Supabase 公式ドキュメントの命名
-- (handle_new_user) をそのまま使って作った初期版が、名前を変えて作り直した
-- あとも残っていたもの。
--
-- 消す前の中身を記録として残しておく (復元したくなったとき用):
--
--   create or replace function public.handle_new_user()
--   returns trigger language plpgsql security definer set search_path to 'public'
--   as $$
--   begin
--     insert into public.users (id, name)
--     values (new.id, coalesce(new.raw_user_meta_data->>'name', 'ユーザー'))
--     on conflict (id) do nothing;
--     return new;
--   end;
--   $$;
--
-- 放置しても動作上の害は無いが、「auth.users のトリガーはどっちを呼んでいるのか」
-- を毎回調べ直す状態になる。今回それを調べたので、ここで消しておく。
drop function if exists public.handle_new_user();


-- 2. recount_ff_counts() を RPC から外す ----------------------------------
-- Supabase では public スキーマの関数が自動的に PostgREST の RPC として開く。
--
--   POST /rest/v1/rpc/recount_ff_counts
--
-- publishable key はブラウザのバンドルに入っているので、ログイン済みなら
-- 誰でも叩ける。中身は users 全行の UPDATE で、security definer なので
-- RLS も迂回する。連打されると単純に重い。
--
-- この関数は「ff のトリガーが壊れていた期間のズレを直す」ための手動ツールで、
-- アプリから呼ぶ経路は無い。ダッシュボードの SQL Editor からは postgres
-- ロールで実行するので、revoke しても手作業には影響しない。
--
-- Postgres の既定では新しい関数の EXECUTE は PUBLIC に付与されるので、
-- anon / authenticated と併せて public からも剥がす。
revoke execute on function public.recount_ff_counts() from public, anon, authenticated;

-- can_view_post() は revoke してはいけない。RLS ポリシーの式は問い合わせた
-- ユーザーの権限で評価されるため、authenticated から EXECUTE を剥がすと
-- posts / likes / comments / storage.objects の select ポリシーが丸ごと落ちる。
