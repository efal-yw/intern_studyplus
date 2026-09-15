-- 表示名にメールアドレスが出ている行を、登録時に入力されたユーザー名で埋め直す。
--
-- 経緯:
-- サインアップ (app/login/page.tsx) は options.data に { username } を渡していて、
-- 値は auth.users.raw_user_meta_data.username に入っている。ところが
-- auth.users の insert トリガーがこのキーを読んでおらず、users.name が
-- NOT NULL なせいで coalesce(..., new.email) のフォールバックに落ちていた。
-- エラーにならないので気づけない類の壊れ方で、
--   ・新規登録者は全員メアドが表示名になる
--   ・マイページで自分で直した人だけが正常
-- という状態になっていた。
--
-- トリガー本体の修正は別のマイグレーションで行う。これは過去分の埋め直し専用。
-- トリガーは insert 時にしか動かないので、関数を直しても既存行は直らない。


-- 埋め直し ----------------------------------------------------------------
-- 二重の絞り込みをかけている。
--
--   1. username が空でない行だけ  … 取れない行は触りようがない。
--      2026-08-16 以前の登録には username がそもそも無い (入力欄を付ける前)。
--   2. 今の name がメアドと一致する行だけ  … フォールバックで入った値だと
--      確定できるのはこの条件を満たすときだけ。マイページで編集済みの名前を
--      登録時の値で上書きして戻してしまうのを防ぐ。
--
-- 条件が重なった結果0件だったとしても、それは「直すものが無い」なので正常。
update public.users u
set name = trim(au.raw_user_meta_data ->> 'username')
from auth.users au
where au.id = u.id
  and nullif(trim(au.raw_user_meta_data ->> 'username'), '') is not null
  and u.name = au.email;
