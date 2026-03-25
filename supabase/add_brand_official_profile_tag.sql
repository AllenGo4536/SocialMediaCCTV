insert into public.tag_definitions (id, name, group_key)
values ('brand_official_account', '品牌官方号', 'benchmark_type')
on conflict (id) do update set
    name = excluded.name,
    group_key = excluded.group_key;
