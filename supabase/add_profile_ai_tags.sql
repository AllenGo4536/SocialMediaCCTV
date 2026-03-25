create table if not exists public.ai_tag_definitions (
  id text not null,
  name text not null,
  group_key text not null,
  description text null,
  created_at timestamp with time zone not null default now(),
  constraint ai_tag_definitions_pkey primary key (id),
  constraint ai_tag_definitions_group_key_check check (
    group_key in ('content_theme', 'content_format', 'tool_signal', 'commercial_signal')
  )
);

create table if not exists public.profile_ai_tags (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tag_id text not null references public.ai_tag_definitions(id) on delete restrict,
  confidence numeric(5, 2) not null default 0,
  evidence jsonb not null default '[]'::jsonb,
  source_version text not null default 'heuristic_v1',
  generated_at timestamp with time zone not null default now(),
  constraint profile_ai_tags_pkey primary key (profile_id, tag_id)
);

create table if not exists public.profile_ai_summaries (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  summary text not null,
  analyzed_post_count integer not null default 0,
  top_keywords text[] not null default '{}',
  source_version text not null default 'heuristic_v1',
  generated_at timestamp with time zone not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint profile_ai_summaries_pkey primary key (profile_id)
);

create index if not exists idx_profile_ai_tags_profile_id on public.profile_ai_tags (profile_id);
create index if not exists idx_profile_ai_tags_tag_id on public.profile_ai_tags (tag_id);

insert into public.ai_tag_definitions (id, name, group_key, description) values
  ('pet_cctv', '宠物监控叙事', 'content_theme', '以猫狗或宠物为主角，带有监控视角、夜视或反应流叙事的内容'),
  ('pet_anthropomorphic', '宠物拟人化剧情', 'content_theme', '把宠物放入约会、面试、上班、做饭等拟人化场景'),
  ('fandom_character_remix', '影视角色混剪重制', 'content_theme', '围绕影视、漫画、游戏角色进行 AI 改编或再演绎'),
  ('fashion_concept_remix', '时尚概念视觉', 'content_theme', '围绕穿搭、时尚品牌、名人概念图或产品视觉展开'),
  ('surreal_ai_music_video', '超现实音乐视频', 'content_theme', '结合超现实视觉、音乐、歌词或 MV 式表达的 AI 内容'),
  ('nostalgia_pov', '怀旧 POV / 年代叙事', 'content_theme', '围绕年代感、复古、历史穿越、POV 叙事的内容'),
  ('transition_tutorial', '转场教程', 'content_format', '以 transition、flashback、before/after 等技巧作为主内容'),
  ('prompt_unlock_funnel', 'Prompt 领取漏斗', 'content_format', '通过评论关键词、私信、guide link 等方式承接转化'),
  ('cinematic_edit', '电影感剪辑', 'content_format', '强调 cinematic、lighting、realistic 等电影化视觉表达'),
  ('short_reaction_loop', '短反应循环', 'content_format', '短小、反应型、循环型内容，常见于宠物和趣味账号'),
  ('uses_higgsfield', '高频提及 Higgsfield', 'tool_signal', '文案或标签中频繁出现 Higgsfield'),
  ('uses_kling', '高频提及 Kling', 'tool_signal', '文案或标签中频繁出现 Kling / KlingAI'),
  ('uses_veo', '高频提及 VEO', 'tool_signal', '文案或标签中频繁出现 VEO'),
  ('uses_suno', '高频提及 Suno', 'tool_signal', '文案或标签中频繁出现 Suno'),
  ('uses_seedance', '高频提及 Seedance', 'tool_signal', '文案或标签中频繁出现 Seedance'),
  ('uses_hitpaw', '高频提及 HitPaw', 'tool_signal', '文案或标签中频繁出现 HitPaw'),
  ('lead_gen_content', '内容承接获客', 'commercial_signal', '内容本身承担评论、私信、教程领取等获客动作'),
  ('serializable_format', '适合系列化生产', 'commercial_signal', '账号近期内容具有稳定模板，适合矩阵化复制'),
  ('brand_integration_ready', '适合品牌植入', 'commercial_signal', '内容中出现明确广告、产品植入或品牌合作结构')
on conflict (id) do update set
  name = excluded.name,
  group_key = excluded.group_key,
  description = excluded.description;
