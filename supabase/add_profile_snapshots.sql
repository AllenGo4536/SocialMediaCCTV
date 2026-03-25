create table if not exists public.profile_snapshots (
  id uuid not null default gen_random_uuid (),
  profile_id uuid not null,
  platform text not null default 'instagram',
  followers_count bigint null,
  follows_count bigint null,
  profile_posts_count integer null,
  recorded_at timestamp with time zone not null default now(),
  constraint profile_snapshots_pkey primary key (id),
  constraint profile_snapshots_profile_id_fkey foreign key (profile_id) references profiles (id) on delete cascade,
  constraint profile_snapshots_platform_check check (platform in ('instagram', 'tiktok', 'youtube'))
);

create index if not exists idx_profile_snapshots_profile_id_recorded_at
  on public.profile_snapshots (profile_id, recorded_at desc);

create index if not exists idx_profile_snapshots_platform_recorded_at
  on public.profile_snapshots (platform, recorded_at desc);
