-- ベースライン。supabase/tools/dump-schema.mjs が現在のDBから生成した。
--
-- このファイルが migrations/ の唯一の1本目。これ以前の差分は
-- supabase/migrations_archive/ に退避してあり、内容はすべてここに畳み込まれている。
--
-- 【既存のリモートDB（本番）には流さない】
--   中身はすでに全部入っている。履歴に記録するだけ:
--     npx supabase@latest migration repair --status applied 20260915130000
--
-- 【空の新規プロジェクトには流してよい】
--   検証用プロジェクトを作るときは、これを db push すればスキーマが再現する。
--   ただし Storage のバケット設定と Auth の設定は SQL に含まれないので手で揃える
--   （supabase/README.md 末尾を参照）。
--
-- ここは現在のDBの写し。直接編集しないこと。
-- 変更したいときは新しいマイグレーションを足す。

create type public.post_type as enum ('record', 'ask', 'knowledge');

create type public.visibility_scope as enum ('private', 'ff', 'public');

create table public.category_textbook (
  id uuid default gen_random_uuid() not null,
  user_id uuid default gen_random_uuid(),
  category_name text
);

create table public.comments (
  comment_id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  post_id uuid not null,
  contents text not null,
  created_at timestamp with time zone default now() not null
);

create table public.ff (
  id bigint generated always as identity not null,
  from_user_id uuid not null,
  to_user_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table public.likes (
  like_id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  post_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table public.post_ask (
  post_id uuid not null,
  question text not null
);

create table public.post_knowledge (
  post_id uuid not null,
  contents text not null
);

create table public.post_record (
  post_id uuid not null,
  textbook uuid not null,
  hours smallint,
  minutes smallint
);

create table public.posts (
  post_id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  type post_type not null,
  note text,
  visibility visibility_scope default 'ff'::visibility_scope not null,
  created_at timestamp with time zone default now() not null,
  image text
);

create table public.textbook (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  created_at timestamp with time zone default now() not null,
  category uuid
);

create table public.users (
  id uuid not null,
  name text not null,
  created_at timestamp with time zone default now() not null,
  follower_count integer default 0 not null,
  following_count integer default 0 not null,
  status_message text,
  avatar_path text
);

alter table public.category_textbook add constraint category_textbook_pkey PRIMARY KEY (id);

alter table public.category_textbook add constraint category_textbook_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

alter table public.comments add constraint comments_pkey PRIMARY KEY (comment_id);

alter table public.comments add constraint comments_contents_length CHECK (((char_length(btrim(contents)) >= 1) AND (char_length(btrim(contents)) <= 500)));

alter table public.comments add constraint comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE;

alter table public.comments add constraint comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

alter table public.ff add constraint ff_pkey PRIMARY KEY (id);

alter table public.ff add constraint ff_unique UNIQUE (from_user_id, to_user_id);

alter table public.ff add constraint ff_no_self CHECK ((from_user_id <> to_user_id));

alter table public.ff add constraint ff_no_self_follow CHECK ((from_user_id <> to_user_id));

alter table public.ff add constraint ff_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE;

alter table public.ff add constraint ff_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE;

alter table public.likes add constraint likes_pkey PRIMARY KEY (like_id);

alter table public.likes add constraint likes_unique UNIQUE (user_id, post_id);

alter table public.likes add constraint likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE;

alter table public.likes add constraint likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

alter table public.post_ask add constraint post_ask_pkey PRIMARY KEY (post_id);

alter table public.post_ask add constraint post_ask_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE;

alter table public.post_knowledge add constraint post_knowledge_pkey PRIMARY KEY (post_id);

alter table public.post_knowledge add constraint post_knowledge_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE;

alter table public.post_record add constraint post_record_pkey PRIMARY KEY (post_id);

alter table public.post_record add constraint post_record_textbook_fkey FOREIGN KEY (textbook) REFERENCES textbook(id);

alter table public.post_record add constraint post_record_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE;

alter table public.posts add constraint posts_pkey PRIMARY KEY (post_id);

alter table public.posts add constraint posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

alter table public.textbook add constraint textbook_pkey PRIMARY KEY (id);

alter table public.textbook add constraint textbook_category_fkey FOREIGN KEY (category) REFERENCES category_textbook(id);

alter table public.textbook add constraint textbook_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

alter table public.users add constraint users_pkey PRIMARY KEY (id);

alter table public.users add constraint users_counts_non_negative CHECK (((follower_count >= 0) AND (following_count >= 0)));

alter table public.users add constraint users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_comments_post ON public.comments USING btree (post_id);

CREATE INDEX idx_comments_user ON public.comments USING btree (user_id);

CREATE INDEX idx_ff_follower ON public.ff USING btree (to_user_id);

CREATE INDEX idx_ff_followee ON public.ff USING btree (from_user_id);

CREATE UNIQUE INDEX ff_from_to_unique ON public.ff USING btree (from_user_id, to_user_id);

CREATE INDEX idx_likes_post ON public.likes USING btree (post_id);

CREATE INDEX idx_likes_user ON public.likes USING btree (user_id);

CREATE INDEX idx_posts_user ON public.posts USING btree (user_id);

CREATE OR REPLACE FUNCTION public.can_view_post(p_post_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.posts p
    where p.post_id = p_post_id
      and (
            p.user_id = auth.uid()                       -- 自分の投稿
         or p.visibility = 'public'                      -- 全体公開
         or ( p.visibility = 'ff'
              and exists (                               -- 投稿者をフォローしている
                select 1 from public.ff f
                where f.to_user_id = p.user_id
                  and f.from_user_id = auth.uid()
              ))
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.recount_ff_counts()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.users u
  set follower_count  = (select count(*) from public.ff where to_user_id   = u.id),
      following_count = (select count(*) from public.ff where from_user_id = u.id);
$function$
;

CREATE OR REPLACE FUNCTION public.sync_ff_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'INSERT') then
    update public.users set follower_count  = follower_count  + 1 where id = new.to_user_id;
    update public.users set following_count = following_count + 1 where id = new.from_user_id;
    return new;

  elsif (tg_op = 'DELETE') then
    update public.users set follower_count  = greatest(follower_count  - 1, 0) where id = old.to_user_id;
    update public.users set following_count = greatest(following_count - 1, 0) where id = old.from_user_id;
    return old;

  elsif (tg_op = 'UPDATE') then
    -- フォロー関係の張り替え（通常は起きないが念のため）
    if (old.to_user_id is distinct from new.to_user_id) then
      update public.users set follower_count = greatest(follower_count - 1, 0) where id = old.to_user_id;
      update public.users set follower_count = follower_count + 1              where id = new.to_user_id;
    end if;
    if (old.from_user_id is distinct from new.from_user_id) then
      update public.users set following_count = greatest(following_count - 1, 0) where id = old.from_user_id;
      update public.users set following_count = following_count + 1              where id = new.from_user_id;
    end if;
    return new;
  end if;

  return null;
end;
$function$
;

grant execute on function public.can_view_post(p_post_id uuid) to public, postgres, anon, authenticated, service_role;

grant execute on function public.handle_new_auth_user() to public, postgres, anon, authenticated, service_role;

grant execute on function public.recount_ff_counts() to postgres, service_role;

grant execute on function public.sync_ff_counts() to public, postgres, anon, authenticated, service_role;

CREATE TRIGGER trg_ff_counts_upd AFTER UPDATE OF from_user_id, to_user_id ON public.ff FOR EACH ROW EXECUTE FUNCTION public.sync_ff_counts();

CREATE TRIGGER trg_ff_counts_ins AFTER INSERT ON public.ff FOR EACH ROW EXECUTE FUNCTION public.sync_ff_counts();

CREATE TRIGGER trg_ff_counts_del AFTER DELETE ON public.ff FOR EACH ROW EXECUTE FUNCTION public.sync_ff_counts();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

alter table public.category_textbook enable row level security;

alter table public.comments enable row level security;

alter table public.ff enable row level security;

alter table public.likes enable row level security;

alter table public.post_ask enable row level security;

alter table public.post_knowledge enable row level security;

alter table public.post_record enable row level security;

alter table public.posts enable row level security;

alter table public.textbook enable row level security;

alter table public.users enable row level security;

create policy "Users can view their own categories" on public.category_textbook as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy "Users can insert their own categories" on public.category_textbook as PERMISSIVE for INSERT to authenticated
  with check ((auth.uid() = user_id));

create policy comments_delete_self on public.comments as PERMISSIVE for DELETE to public
  using ((user_id = auth.uid()));

create policy comments_select on public.comments as PERMISSIVE for SELECT to public
  using (public.can_view_post(post_id));

create policy comments_insert_self on public.comments as PERMISSIVE for INSERT to public
  with check (((user_id = auth.uid()) AND public.can_view_post(post_id)));

create policy comments_update_self on public.comments as PERMISSIVE for UPDATE to public
  using ((user_id = auth.uid()));

create policy ff_delete_self on public.ff as PERMISSIVE for DELETE to authenticated
  using ((from_user_id = auth.uid()));

create policy ff_select_all on public.ff as PERMISSIVE for SELECT to authenticated
  using (true);

create policy ff_insert_self on public.ff as PERMISSIVE for INSERT to authenticated
  with check ((from_user_id = auth.uid()));

create policy likes_delete_self on public.likes as PERMISSIVE for DELETE to public
  using ((user_id = auth.uid()));

create policy likes_insert_self on public.likes as PERMISSIVE for INSERT to public
  with check (((user_id = auth.uid()) AND public.can_view_post(post_id)));

create policy likes_select on public.likes as PERMISSIVE for SELECT to public
  using (public.can_view_post(post_id));

create policy post_ask_write on public.post_ask as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.post_id = post_ask.post_id) AND (p.user_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.post_id = post_ask.post_id) AND (p.user_id = auth.uid())))));

create policy post_ask_select on public.post_ask as PERMISSIVE for SELECT to public
  using (public.can_view_post(post_id));

create policy post_knowledge_select on public.post_knowledge as PERMISSIVE for SELECT to public
  using (public.can_view_post(post_id));

create policy post_knowledge_write on public.post_knowledge as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.post_id = post_knowledge.post_id) AND (p.user_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.post_id = post_knowledge.post_id) AND (p.user_id = auth.uid())))));

create policy post_record_select on public.post_record as PERMISSIVE for SELECT to public
  using (public.can_view_post(post_id));

create policy post_record_write on public.post_record as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.post_id = post_record.post_id) AND (p.user_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.post_id = post_record.post_id) AND (p.user_id = auth.uid())))));

create policy posts_delete_own on public.posts as PERMISSIVE for DELETE to authenticated
  using ((user_id = auth.uid()));

create policy posts_delete_self on public.posts as PERMISSIVE for DELETE to public
  using ((user_id = auth.uid()));

create policy posts_insert_self on public.posts as PERMISSIVE for INSERT to public
  with check ((user_id = auth.uid()));

create policy posts_select_visible on public.posts as PERMISSIVE for SELECT to public
  using (((user_id = auth.uid()) OR (visibility = 'public'::visibility_scope) OR ((visibility = 'ff'::visibility_scope) AND (EXISTS ( SELECT 1
   FROM ff f
  WHERE ((f.from_user_id = posts.user_id) AND (f.to_user_id = auth.uid())))))));

create policy posts_update_self on public.posts as PERMISSIVE for UPDATE to public
  using ((user_id = auth.uid()));

create policy "Users can insert their own textbooks" on public.textbook as PERMISSIVE for INSERT to authenticated
  with check ((auth.uid() = user_id));

create policy "Users can view their own textbooks" on public.textbook as PERMISSIVE for SELECT to public
  using (((auth.uid())::text = (user_id)::text));

create policy users_insert_self on public.users as PERMISSIVE for INSERT to authenticated
  with check ((id = auth.uid()));

create policy users_select_all on public.users as PERMISSIVE for SELECT to authenticated
  using (true);

create policy users_update_self on public.users as PERMISSIVE for UPDATE to authenticated
  using ((id = auth.uid()))
  with check ((id = auth.uid()));

create policy posts_images_delete_own on storage.objects as PERMISSIVE for DELETE to authenticated
  using (((bucket_id = 'posts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy posts_images_select_visible on storage.objects as PERMISSIVE for SELECT to authenticated
  using (((bucket_id = 'posts'::text) AND public.can_view_post(((storage.foldername(name))[2])::uuid)));

create policy avatars_insert_own on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy "Give users authenticated access to folder 1oj01fe_2" on storage.objects as PERMISSIVE for UPDATE to public
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));

create policy avatars_delete_own on storage.objects as PERMISSIVE for DELETE to authenticated
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy posts_images_insert_own on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (((bucket_id = 'posts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
