-- 教材を消せるようにする。記録投稿は残し、教材への参照だけを切る。
--
-- ひとつ前の 20260915140207 で textbook に DELETE ポリシーを足したが、
-- post_record.textbook の FK (on delete 指定なし = NO ACTION) が止めるため、
-- 記録投稿に一度でも使った教材は実際には消せなかった。
--
-- 選択肢は3つあった:
--   (a) 使用済み教材は消せないまま。UI でそう見せる
--   (b) 教材を消したら該当の記録投稿も消す
--   (c) 参照を NULL にして投稿は残す          ← これを採る
--
-- (b) を採らない理由:
--   post_record だけが消えると posts に type='record' の親だけが残り、
--   タイムラインが中身の無い投稿を描画しようとする。投稿ごと消すには
--   トリガーかアプリ側の二段階削除が要り、どちらも「教材を消しただけで
--   学習記録が消えた」という取り返しのつかない副作用を持つ。
--
-- (c) の結果:
--   教材を消しても学習時間とメモは残り、教材名の欄だけが空になる。
--   アプリ側は「削除された教材」と表示する
--   (app/timeline/components/record.tsx)。


-- 1. 参照を NULL にできるようにする -------------------------------------------
-- textbook が NULL の post_record は「教材が後から消された記録」を意味する。
-- 新規作成時は必ず埋まる (app/record/[id]/page.tsx が textbookId を渡す)。
alter table public.post_record alter column textbook drop not null;


-- 2. FK を on delete set null に張り替える ------------------------------------
alter table public.post_record
  drop constraint if exists post_record_textbook_fkey;

alter table public.post_record
  add constraint post_record_textbook_fkey
  foreign key (textbook) references public.textbook(id) on delete set null;


-- 注意:
--   この変更で lib/database.types.ts の post_record.textbook が
--   string から string | null に変わる。流したあと npm run db:types を
--   忘れないこと。型が古いままだと NULL を考慮していないコードが
--   型チェックを素通りする。
