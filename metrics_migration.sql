-- Create table for storing historical snapshots of post metrics
create table if not exists public.post_snapshots (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  like_count bigint default 0,
  comment_count bigint default 0,
  video_view_count bigint default 0,
  video_play_count bigint default 0,
  recorded_at timestamp with time zone default now()
);

-- Create an index on post_id and recorded_at for faster querying of history
create index if not exists idx_post_snapshots_post_id on public.post_snapshots(post_id);
create index if not exists idx_post_snapshots_recorded_at on public.post_snapshots(recorded_at);

-- Optional: Enable RLS (Row Level Security) if your project uses it strictly
-- alter table public.post_snapshots enable row level security;
-- create policy "Allow public read access" on public.post_snapshots for select using (true);
-- create policy "Allow service role full access" on public.post_snapshots using (true) with check (true);
