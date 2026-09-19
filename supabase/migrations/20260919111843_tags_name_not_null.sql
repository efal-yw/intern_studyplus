-- tags.name を not null にする。
--
-- なぜ:
--   tags は「タグ名のマスタ」なので、名前の無い行に意味が無い。
--   にもかかわらず nullable だったため、アプリ側の型が name: string | null になり、
--   タイムラインのタグ一覧 (app/timeline/components/getTags.tsx) で
--     Type 'string | null' is not assignable to type 'string'
--   という型エラーが出ていた。表示側で毎回 null を捌くより、
--   「名前の無いタグは存在しない」をDBの制約として持たせるほうが正しい。
--
--   これを入れると lib/database.types.ts の tags.Row.name が string になり、
--   getTags.tsx の受け皿 TimelineTag = { id: string; name: string } と噛み合う。
--
-- 既存の null は無い (確認済み) ので、埋める処理は入れていない。
-- 【もし null が残っていれば、この alter はその場で失敗して止まる】。
--   それで正しい。勝手に値を捏造して通すより、止まって気付けるほうがよい。
--   その場合は中身を見て、名前を付けるか行を消してから流し直すこと。
--
-- set not null は既に not null な列に流しても何も起きないので、
-- このファイルはそのまま冪等になっている
-- (ローカルDBが無く本番に直接流すため。supabase/README.md の方針)。

alter table public.tags
  alter column name set not null;
