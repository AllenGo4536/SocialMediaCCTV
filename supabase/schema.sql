-- Create profiles table
create table if not exists public.profiles (
  id uuid not null default gen_random_uuid (),
  username text not null,
  external_id text null,
  profile_url text null,
  full_name text null,
  avatar_url text null,
  is_verified boolean null,
  created_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username)
);

-- Create posts table
create table if not exists public.posts (
  id uuid not null default gen_random_uuid (),
  profile_id uuid not null,
  external_id text not null,
  short_code text null,
  type text null,
  caption text null,
  display_url text null,
  video_url text null,
  permalink text null,
  like_count bigint null default 0,
  comment_count bigint null default 0,
  video_view_count bigint null default 0,
  video_play_count bigint null default 0,
  hashtags text[] null,
  is_pinned boolean null,
  posted_at timestamp with time zone null,
  updated_at timestamp with time zone not null default now(),
  constraint posts_pkey primary key (id),
  constraint posts_external_id_key unique (external_id),
  constraint posts_profile_id_fkey foreign key (profile_id) references profiles (id) on delete cascade
);

-- Indexes
create index if not exists idx_posts_profile_id on public.posts (profile_id);
create index if not exists idx_posts_posted_at on public.posts (posted_at);
create index if not exists idx_posts_like_count on public.posts (like_count desc);
