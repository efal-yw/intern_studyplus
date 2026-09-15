-- tags / post_tags に RLS ポリシーを付ける。
--
-- この2テーブルはダッシュボードで直接作られていて、マイグレーションが
-- 1本も無かった。Supabase は新規テーブルに RLS を自動で有効化するが
-- ポリシーは作らないため、「RLS 有効 + ポリシー0件」= 全ロールから0件、
-- という状態になっていた。
--
-- 症状: /record/ask と /record/knowledge でタグが1つも表示されない。
--   select 自体は成功して error が null で返るので、ページ側の
--   `if (tagError) throw` は発動せず、空配列のまま .map() が
--   何も描かずに終わる。エラーログにも何も出ない。
--
-- 冪等に書く。ローカルDBが無く本番に直接流すため、途中で落ちても
-- 同じファイルを流し直せるようにしておく
-- (20260915134053_fix_posts_select_visible_direction.sql と同じ方針)。


-- テーブル定義そのものはここで作らない --------------------------------------
--
-- 既に本番に存在しているため、create table を書くと流せなくなる。
-- このファイルは「欠けていたポリシーを足す」ことだけを担当する。
-- 参考までに現在の形 (lib/database.types.ts から):
--   tags      (id uuid pk, name text null, created_at timestamptz)
--   post_tags (id uuid pk, post_id uuid null → posts.post_id,
--              tag_id uuid null → tags.id, created_at timestamptz)

alter table public.tags enable row level security;
alter table public.post_tags enable row level security;


-- tags: タグ名のマスタ -------------------------------------------------------
--
-- 行に持ち主がいない共有マスタなので、読みは全ログインユーザーに開ける。
--
-- 対象ロールを authenticated にして anon を外してある。users_select_all /
-- ff_select_all と同じ扱い。投稿フォームはログイン必須なのでこれで足りる。
-- 【将来タイムラインを未ログインでも見せてタグも出すなら、ここを public に
--   広げる必要がある】。posts_select_visible は anon を含んでいるので、
--   タグだけ見えないという食い違いが出る。

drop policy if exists tags_select_authenticated on public.tags;

create policy tags_select_authenticated on public.tags
  for select to authenticated
  using (true);

-- 書き込みポリシーは【意図的に作っていない】。
-- 現状タグを増やす画面は無く、マスタの追加はダッシュボード
-- (service_role = RLS をバイパス) から行う想定のため。
-- ユーザーが自由にタグを作れる UI を足すときに、そこで insert ポリシーを
-- 追加すること。無いうちは insert が黙って0件になる。


-- post_tags: 投稿とタグの中間テーブル ----------------------------------------
--
-- 読み: 投稿本体が見える人だけ、その投稿のタグが見える。
-- post_ask / post_knowledge / post_record と完全に同じ形にする。
-- can_view_post() は boolean を返す (exists なので null にならない) ため、
-- post_id が null の行は false になって誰にも見えない。

drop policy if exists post_tags_select on public.post_tags;

create policy post_tags_select on public.post_tags
  for select to public
  using (public.can_view_post(post_id));

-- 書き: 自分の投稿に紐づく行だけ。
--
-- for ALL にしているのは兄弟テーブルの *_write に合わせたのに加え、
-- サーバーアクションのロールバックが delete を撃つため。
-- app/record/ask/page.tsx と knowledge/page.tsx は、子テーブルの insert に
-- 失敗したとき post_tags → posts の順に消しにいく。delete ポリシーが
-- 無いと、そこが黙って0件削除になって post_tags だけ残る。
--
-- using (既存行を触れるか) と with check (書き込む行が条件を満たすか) の
-- 両方に同じ条件を置く。片方だけだと insert か delete のどちらかが通らない。

drop policy if exists post_tags_write on public.post_tags;

create policy post_tags_write on public.post_tags
  for all to public
  using (
    exists (
      select 1 from public.posts p
      where p.post_id = post_tags.post_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.posts p
      where p.post_id = post_tags.post_id
        and p.user_id = auth.uid()
    )
  );


-- 外部キーの索引 -------------------------------------------------------------
--
-- post_tags は「この投稿のタグ一覧」と「このタグが付いた投稿一覧」の
-- 両方向で引く。Postgres は外部キーに索引を自動では張らないため明示する。
-- post_tags_select の can_view_post() も post_id 側を使う。

create index if not exists post_tags_post_id_idx on public.post_tags (post_id);
create index if not exists post_tags_tag_id_idx on public.post_tags (tag_id);
