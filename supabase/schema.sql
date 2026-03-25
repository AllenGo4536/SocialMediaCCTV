-- Create profiles table
create table if not exists public.profiles (
  id uuid not null default gen_random_uuid (),
  platform text not null default 'instagram',
  username text not null,
  external_id text null,
  profile_url text null,
  full_name text null,
  avatar_url text null,
  is_verified boolean null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_platform_check check (platform in ('instagram', 'tiktok', 'youtube')),
  constraint profiles_platform_username_key unique (platform, username)
);

-- Create posts table
create table if not exists public.posts (
  id uuid not null default gen_random_uuid (),
  platform text not null default 'instagram',
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
  constraint posts_platform_check check (platform in ('instagram', 'tiktok', 'youtube')),
  constraint posts_platform_external_id_key unique (platform, external_id),
  constraint posts_profile_id_fkey foreign key (profile_id) references profiles (id) on delete cascade
);

-- Create fixed tag dictionary
create table if not exists public.tag_definitions (
  id text not null,
  name text not null,
  group_key text not null,
  created_at timestamp with time zone not null default now(),
  constraint tag_definitions_pkey primary key (id),
  constraint tag_definitions_group_key_check check (group_key in ('benchmark_type', 'culture', 'content_type'))
);

-- Create profile-to-tag relation (many-to-many)
create table if not exists public.profile_tags (
  profile_id uuid not null,
  tag_id text not null,
  created_at timestamp with time zone not null default now(),
  constraint profile_tags_pkey primary key (profile_id, tag_id),
  constraint profile_tags_profile_id_fkey foreign key (profile_id) references profiles (id) on delete cascade,
  constraint profile_tags_tag_id_fkey foreign key (tag_id) references tag_definitions (id) on delete restrict
);

-- Indexes
create index if not exists idx_posts_profile_id on public.posts (profile_id);
create index if not exists idx_posts_posted_at on public.posts (posted_at);
create index if not exists idx_posts_like_count on public.posts (like_count desc);
create index if not exists idx_posts_platform on public.posts (platform);
create index if not exists idx_profiles_platform on public.profiles (platform);
create index if not exists idx_profiles_created_by on public.profiles (created_by);
create index if not exists idx_profile_tags_profile_id on public.profile_tags (profile_id);
create index if not exists idx_profile_tags_tag_id on public.profile_tags (tag_id);

-- Seed fixed tags
insert into public.tag_definitions (id, name, group_key) values
  ('ip_benchmark', 'IP对标', 'benchmark_type'),
  ('aesthetic_benchmark', '美学对标', 'benchmark_type'),
  ('brand_official_account', '品牌官方号', 'benchmark_type'),
  ('uncategorized', '未分类', 'benchmark_type'),
  ('culture_me', '中东', 'culture'),
  ('culture_west', '欧美', 'culture'),
  ('style_performance_camera', '穿搭/唱跳/运镜', 'content_type'),
  ('pov', 'POV', 'content_type'),
  ('daily_life', '日常记录', 'content_type'),
  ('asmr', 'ASMR', 'content_type'),
  ('virtual_idol', '虚拟偶像', 'content_type')
on conflict (id) do update set
  name = excluded.name,
  group_key = excluded.group_key;
