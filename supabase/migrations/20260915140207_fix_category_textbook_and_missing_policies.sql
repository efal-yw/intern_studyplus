-- 教材(textbook)とカテゴリ(category_textbook)まわりの積み残しをまとめて直す。
-- どちらもダッシュボードで手作業で作ったまま、他のテーブルに追いついていない。
--
--   1. category_textbook.user_id の既定値が乱数
--   2. category_textbook だけ FK に cascade が無く、アカウント削除が失敗する
--   3. カテゴリを消したとき教材がどうなるか決まっていない
--   4. UPDATE / DELETE ポリシーが無く、作ったら直せない・消せない
--   5. 教材の SELECT ポリシーが uuid を text にキャストして比較している
--
-- 本番に直接流すので、途中で落ちても流し直せるよう全体を冪等に書く。


-- 1. user_id の既定値 -------------------------------------------------------
-- `default gen_random_uuid()` は id 列の定義を写したときの取り残し。
-- 省略して insert すると誰にも紐づかない uuid が入り、FK 違反で必ず落ちる。
-- 既定値として機能する余地が無いので外す。
alter table public.category_textbook alter column user_id drop default;

-- NULL 許容も外す。ただし既存行に NULL があると not null が張れない。
-- 黙って消すとユーザーのデータを勝手に捨てることになるので、
-- 見つかったら止めて人間に判断させる。
do $$
declare
  orphan_count bigint;
begin
  select count(*) into orphan_count
  from public.category_textbook
  where user_id is null;

  if orphan_count > 0 then
    raise exception
      'category_textbook に user_id が NULL の行が % 件ある。'
      '持ち主が特定できないので自動では直せない。'
      '中身を確認して手で埋めるか削除してから、このマイグレーションを流し直すこと。',
      orphan_count;
  end if;
end $$;

alter table public.category_textbook alter column user_id set not null;


-- 2. アカウント削除の経路をつなぐ ---------------------------------------------
-- users を参照する FK のうち、ここだけ cascade が無い。
--   auth.users 削除 → users 削除(cascade) → ここで FK 違反で停止
-- カテゴリを1件でも持っているユーザーは退会できない状態だった。
-- 他のテーブル(comments / ff / likes / posts / textbook)はすべて cascade。
alter table public.category_textbook
  drop constraint if exists category_textbook_user_id_fkey;

alter table public.category_textbook
  add constraint category_textbook_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;


-- 3. カテゴリを消したときの教材 -----------------------------------------------
-- textbook.category は NULL 許容なので、カテゴリが消えたら「未分類」に戻すのが
-- 素直。cascade にすると、カテゴリを消しただけで中の教材が巻き添えで消える。
alter table public.textbook
  drop constraint if exists textbook_category_fkey;

alter table public.textbook
  add constraint textbook_category_fkey
  foreign key (category) references public.category_textbook(id) on delete set null;

-- なお post_record.textbook の FK は【意図的に触っていない】。
-- ここを cascade にすると、教材を消したとき post_record の行だけが消えて
-- posts に type='record' の親だけが残り、アプリが壊れる。
-- 「使用済みの教材を消せるようにするか」は仕様の判断が要るので別で決める。


-- 4. 足りないポリシー ---------------------------------------------------------
-- RLS が有効なテーブルは、ポリシーの無い操作が全部拒否される。
-- SELECT と INSERT しか無かったので、一度作った教材・カテゴリは
-- 名前を直すことも消すこともできなかった。

drop policy if exists "Users can update their own categories" on public.category_textbook;
create policy "Users can update their own categories" on public.category_textbook
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own categories" on public.category_textbook;
create policy "Users can delete their own categories" on public.category_textbook
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can update their own textbooks" on public.textbook;
create policy "Users can update their own textbooks" on public.textbook
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own textbooks" on public.textbook;
create policy "Users can delete their own textbooks" on public.textbook
  for delete to authenticated
  using (user_id = auth.uid());


-- 5. SELECT ポリシーの比較を直す ----------------------------------------------
-- 教材側は `(auth.uid())::text = (user_id)::text` と書かれていた。
-- uuid 同士を text に落として比較しているため、user_id のインデックスが使えず
-- 毎回シーケンシャルスキャンになる。カテゴリ側は uuid のまま比較していて、
-- 同じことを2つの書き方でやっている状態だった。uuid 同士に揃える。
--
-- 対象ロールも authenticated に寄せる。元は `to public` だったが、
-- 述語が auth.uid() 依存で anon は1行も取れないため、挙動は変わらない。
drop policy if exists "Users can view their own textbooks" on public.textbook;
create policy "Users can view their own textbooks" on public.textbook
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can view their own categories" on public.category_textbook;
create policy "Users can view their own categories" on public.category_textbook
  for select to authenticated
  using (user_id = auth.uid());
