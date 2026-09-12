-- コメント本文の長さを DB 側でも縛る。
-- UI の maxLength とサーバーアクションの検証をすり抜けた場合の最後の砦。
-- (サーバーアクションは UI を通さない POST でも叩けるため、アプリ側の検証だけでは足りない)
--
-- 空文字・空白だけのコメントも同時に弾く。アプリ側は getText() で trim してから
-- insert しているので、ここに引っかかるのは UI を通らない経路だけになる。
alter table public.comments
  add constraint comments_contents_length
  check (char_length(btrim(contents)) between 1 and 500);
