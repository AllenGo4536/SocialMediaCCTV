alter table public.profiles
add column if not exists biography text null,
add column if not exists external_url text null,
add column if not exists followers_count bigint null,
add column if not exists follows_count bigint null,
add column if not exists profile_posts_count integer null,
add column if not exists is_private boolean null,
add column if not exists is_business_account boolean null,
add column if not exists business_category_name text null,
add column if not exists profile_scraped_at timestamp with time zone null;
