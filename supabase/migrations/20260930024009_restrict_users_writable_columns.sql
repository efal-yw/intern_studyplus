-- users をユーザーが書き換えられる列を絞る。
--
-- なぜ:
--   users_update_self は「自分の行なら更新してよい」としか言っておらず、
--   どの列かは絞っていなかった。PostgREST を直接叩けば
--     PATCH /rest/v1/users?id=eq.<自分のid>  { "follower_count": 99999 }
--   で、自分のフォロワー数・フォロー数・作成日時を好きな値にできた。
--
--   RLS は「どの行か」しか絞れない。「どの列か」は権限 (grant) で絞る。
--
-- 書き換えてよい列:
--   アプリが実際に更新しているもの (app/mypage/page.tsx) だけ。
--     name / status_message / avatar_path
--   列を足してユーザーに編集させたいときは、下の grant に足すこと。
--
-- 影響を受けないもの:
--   - sync_ff_counts() (フォロー数の自動更新) と handle_new_auth_user()
--     (登録時の行作成) は security definer = 関数の持ち主の権限で動くので、
--     ここで authenticated から権限を外しても止まらない。
--   - ダッシュボードの Table Editor (postgres / service_role で動く)。


-- 1. 更新: 列を指定して許可し直す ---------------------------------------------
-- 表全体への update を外してから、列単位で付け直す。
-- 表全体の権限が残っていると列単位の grant は意味を持たないので、順番が大事。
revoke update on table public.users from anon, authenticated;
grant update (name, status_message, avatar_path) on table public.users to authenticated;


-- 2. 追加: アプリからは行を作らせない -----------------------------------------
-- users の行は登録時に handle_new_auth_user() が作る。アプリに insert する
-- 経路は無い。users_insert_self が残っていると、何らかの理由で行が無い
-- ユーザーが follower_count などを好きな値にして自分の行を作れるので、
-- ポリシーごと外す。
revoke insert on table public.users from anon, authenticated;
drop policy if exists users_insert_self on public.users;
