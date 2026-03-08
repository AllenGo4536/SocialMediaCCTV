-- Feed query optimization indexes.
-- Run this migration after schema/tag tables are in place.

create index if not exists idx_profile_tags_tag_id_profile_id
on public.profile_tags (tag_id, profile_id);

create index if not exists idx_posts_profile_id_posted_at_like_count
on public.posts (profile_id, posted_at desc, like_count desc);

create index if not exists idx_posts_posted_at_like_count
on public.posts (posted_at desc, like_count desc);
