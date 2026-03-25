insert into public.tag_definitions (id, name, group_key)
values ('uncategorized', '未分类', 'benchmark_type')
on conflict (id) do update set
    name = excluded.name,
    group_key = excluded.group_key;

insert into public.profile_tags (profile_id, tag_id)
select profiles.id, 'uncategorized'
from public.profiles
where not exists (
    select 1
    from public.profile_tags
    where public.profile_tags.profile_id = public.profiles.id
)
on conflict (profile_id, tag_id) do nothing;
