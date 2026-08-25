create type public.field_visibility as enum ('public', 'followers', 'private');

create type public.internship_status as enum (
  'considering',  -- 検討中
  'applying',     -- 選考中
  'active',       -- 参加中
  'finished'      -- 終了
);
）
create table if not exists public.grades (
  id smallint primary key,
  label text not null            
);

create table if not exists public.universities (
  id serial primary key,
  name text not null,
  faculty text
);

alter table public.users
  add column if not exists avatar_url    text,
  add column if not exists internship_status public.internship_status default 'considering',
  add column if not exists internship_started_on date,
  add column if not exists record_count  integer not null default 0,
  add column if not exists prefecture    text,
  add column if not exists grade_id      smallint references public.grades(id),
  add column if not exists high_school   text,
  add column if not exists university_id integer  references public.universities(id),
  add column if not exists tags          text[] default '{}';

alter table public.users
  add constraint status_message_length check (char_length(status_message) <= 150);

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

create policy "プロフィール画像は全員が読める"
  on storage.objects for select
  using (bucket_id = 'profile-images');

create policy "プロフィール画像の書き込みは本人のみ"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "プロフィール画像の更新・削除は本人のみ"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


create table if not exists public.profile_field_visibility (
  user_id    uuid not null references public.users(id) on delete cascade,
  field_key  text not null,                             -- profile-fields.ts の FieldKey と一致させる
  visibility public.field_visibility not null default 'public',
  primary key (user_id, field_key)
);

alter table public.profile_field_visibility enable row level security;

create policy "本人のみ読み書き"
  on public.profile_field_visibility
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
