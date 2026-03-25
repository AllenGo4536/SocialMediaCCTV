insert into public.tag_definitions (id, name, group_key)
values ('pet_track', 'Pet宠物赛道', 'benchmark_type')
on conflict (id) do update set
    name = excluded.name,
    group_key = excluded.group_key;
