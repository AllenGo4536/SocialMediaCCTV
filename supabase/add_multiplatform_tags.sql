-- 1) Profiles: add platform + created_by (if missing)
alter table public.profiles
add column if not exists platform text not null default 'instagram';

alter table public.profiles
add column if not exists created_by uuid references auth.users(id) on delete set null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'profiles_platform_check'
    ) then
        alter table public.profiles
        add constraint profiles_platform_check
        check (platform in ('instagram', 'tiktok', 'youtube'));
    end if;
end $$;

alter table public.profiles
drop constraint if exists profiles_username_key;

create unique index if not exists profiles_platform_username_key
on public.profiles (platform, username);

create index if not exists idx_profiles_platform on public.profiles (platform);
create index if not exists idx_profiles_created_by on public.profiles (created_by);

-- 2) Posts: add platform for cross-platform uniqueness
alter table public.posts
add column if not exists platform text not null default 'instagram';

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'posts_platform_check'
    ) then
        alter table public.posts
        add constraint posts_platform_check
        check (platform in ('instagram', 'tiktok', 'youtube'));
    end if;
end $$;

alter table public.posts
drop constraint if exists posts_external_id_key;

create unique index if not exists posts_platform_external_id_key
on public.posts (platform, external_id);

create index if not exists idx_posts_platform on public.posts (platform);

-- 3) Fixed tag taxonomy
create table if not exists public.tag_definitions (
    id text primary key,
    name text not null,
    group_key text not null,
    created_at timestamp with time zone not null default now(),
    constraint tag_definitions_group_key_check
        check (group_key in ('benchmark_type', 'culture', 'content_type'))
);

create table if not exists public.profile_tags (
    profile_id uuid not null references public.profiles(id) on delete cascade,
    tag_id text not null references public.tag_definitions(id) on delete restrict,
    created_at timestamp with time zone not null default now(),
    constraint profile_tags_pkey primary key (profile_id, tag_id)
);

create index if not exists idx_profile_tags_profile_id on public.profile_tags (profile_id);
create index if not exists idx_profile_tags_tag_id on public.profile_tags (tag_id);

insert into public.tag_definitions (id, name, group_key)
values
    ('ip_benchmark', 'IP对标', 'benchmark_type'),
    ('aesthetic_benchmark', '美学对标', 'benchmark_type'),
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
