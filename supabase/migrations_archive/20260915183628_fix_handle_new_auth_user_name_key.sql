-- 新規登録時に users.name へメールアドレスが入ってしまうのを直す。
--
-- トリガー on_auth_user_created (auth.users) が呼ぶ関数の中身はこうなっていた:
--
--   coalesce(new.raw_user_meta_data->>'name', new.email, 'User')
--                                    ^^^^^^
--
-- サインアップ (app/login/page.tsx) が options.data で渡しているキーは
-- 'username' なので、'name' は常に null。結果、2番目の new.email に落ちて
-- 全員のメールアドレスが表示名になっていた。users.name が NOT NULL で
-- フォールバックが用意されているぶん insert は成功してしまい、
-- エラーもログも出ないまま壊れ続ける形になっていた。
--
-- 既存行の埋め直しは 20260915183449_backfill_users_name_from_username.sql 側。
-- トリガーは insert 時にしか動かないので、両方いる。

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.users (id, name, created_at)
  values (
    new.id,
    coalesce(
      -- 本命。メール+パスワードのサインアップはここに入る。
      -- 空白だけの入力をそのまま表示名にしないよう nullif(trim(...)) で落とす
      -- (マイページ側の編集も同じ条件で弾いている)。
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),

      -- 元の実装が見ていたキー。今は誰も書いていないが、OAuth プロバイダを
      -- 足したときにここへ入ってくるので残しておく。
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),

      -- 最後の砦。ここを new.email にはしない。
      -- 「キーが1つずれただけで全員のメールアドレスが画面に出た」のが今回の件で、
      -- 同じ事故をもう一度起こせる状態にしておく理由が無い。
      -- 表示名は他人から見えるものなので、漏れて困らない値を既定にする。
      'ユーザー' || left(new.id::text, 8)
    ),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

-- トリガー (on_auth_user_created) 自体は関数を名前で参照しているので、
-- 張り替えは要らない。この replace だけで次の登録から新しい本体が動く。
