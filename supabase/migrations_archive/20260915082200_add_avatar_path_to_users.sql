-- アイコン画像の保存先を users に持たせる。
--
-- これまではストレージ上のパスが users.id そのもの (avatars/<uuid>) に固定で、
-- アイコンを変えても URL が変わらなかった。その結果:
--
--   ・Supabase Storage の既定は Cache-Control: max-age=3600 なので、
--     差し替えても最大1時間はブラウザ/CDNが古い画像を返す
--   ・Next.js の画像最適化サーバー (.next/cache/images) も URL 単位で持つ
--   ・?v= を付けて誤魔化していたが、バージョンが React の useState だったので
--     リロードすると消えて元の URL に戻っていた
--
-- パスをアップロードごとにユニーク (<user_id>/<uuid>.webp) にして、
-- それをこの列に記録する。URL 自体が毎回変わるので、キャッシュを消す必要が
-- そもそも無くなる (JS/CSS バンドルにハッシュを付けるのと同じ考え方)。
-- アイコンを表示する他の画面も、この列を読めば同じ URL を組み立てられる。

alter table public.users
  add column if not exists avatar_path text;

comment on column public.users.avatar_path is
  'avatars バケット内のパス (<user_id>/<uuid>.webp)。未設定なら null。'
  ' アップロードごとに新しい値になるので、URL は不変として扱ってよい。';

-- 既存行は null のまま = アイコン未設定扱い。
-- 旧パス (avatars/<user_id>) に置いてあるファイルはこの列から参照されなくなるので、
-- ダッシュボードで削除してよい。


-- RLS ------------------------------------------------------------------
-- users の select / update ポリシーは既存のものをそのまま使う。
-- 列を足しただけなので、行単位のポリシーに変更は要らない。
--
-- 【ダッシュボード側で必要な作業】
-- Storage のポリシーは migrations の管理外 (README「dump-schema.sql が拾わないもの」)
-- なので、avatars バケットのポリシーを手で確認すること。
-- パスの形が <user_id> から <user_id>/<uuid>.webp に変わるため、
-- 先頭フォルダ = 自分の uid で判定する形になっている必要がある:
--
--   insert / update / delete:
--     (storage.foldername(name))[1] = auth.uid()::text
--   select:
--     bucket が public なら不要
