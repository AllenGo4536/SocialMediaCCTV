create extension if not exists pgcrypto;

create table if not exists public.ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  source_platform text not null,
  ingest_method text not null default 'manual',
  requested_by text not null,
  status text not null default 'queued',
  error_message text null,
  source_record_id uuid null,
  news_item_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingest_jobs_source_platform_check check (source_platform in ('x', 'wechat')),
  constraint ingest_jobs_status_check check (status in ('queued', 'running', 'succeeded', 'failed')),
  constraint ingest_jobs_ingest_method_check check (ingest_method in ('manual', 'auto_tracked'))
);

create table if not exists public.source_records (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  external_id text null,
  canonical_url text not null,
  author_name text null,
  title text null,
  published_at timestamptz null,
  content_text text null,
  cover_image_url text null,
  media jsonb null,
  metrics jsonb null,
  raw_payload jsonb not null default '{}'::jsonb,
  fetch_status text not null default 'partial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_records_platform_check check (platform in ('x', 'wechat')),
  constraint source_records_fetch_status_check check (fetch_status in ('succeeded', 'partial', 'failed')),
  constraint source_records_platform_canonical_url_key unique (platform, canonical_url),
  constraint source_records_platform_external_id_key unique (platform, external_id)
);

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  source_record_id uuid not null references public.source_records(id) on delete cascade,
  title text not null,
  summary text not null,
  source_platform text not null,
  source_url text not null,
  author_name text not null,
  published_at timestamptz not null,
  cover_image_url text null,
  ingest_method text not null default 'manual',
  status text not null default 'pending',
  created_by text not null,
  updated_by text not null,
  tags text[] null,
  is_top_story boolean not null default false,
  source_metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_items_source_platform_check check (source_platform in ('x', 'wechat')),
  constraint news_items_status_check check (status in ('pending', 'featured', 'ignored')),
  constraint news_items_ingest_method_check check (ingest_method in ('manual', 'auto_tracked')),
  constraint news_items_source_record_id_key unique (source_record_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ingest_jobs_source_record_id_fkey'
  ) then
    alter table public.ingest_jobs
      add constraint ingest_jobs_source_record_id_fkey
      foreign key (source_record_id) references public.source_records(id) on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ingest_jobs_news_item_id_fkey'
  ) then
    alter table public.ingest_jobs
      add constraint ingest_jobs_news_item_id_fkey
      foreign key (news_item_id) references public.news_items(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_ingest_jobs_status on public.ingest_jobs (status);
create index if not exists idx_ingest_jobs_created_at on public.ingest_jobs (created_at desc);
create index if not exists idx_source_records_platform on public.source_records (platform);
create index if not exists idx_source_records_published_at on public.source_records (published_at desc);
create index if not exists idx_news_items_status on public.news_items (status);
create index if not exists idx_news_items_platform on public.news_items (source_platform);
create index if not exists idx_news_items_published_at on public.news_items (published_at desc);
