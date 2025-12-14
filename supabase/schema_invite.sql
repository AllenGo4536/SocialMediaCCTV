-- Create invite_codes table
create table if not exists public.invite_codes (
  id uuid not null default gen_random_uuid (),
  code text not null,
  is_used boolean default false,
  used_by uuid references auth.users(id),
  used_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint invite_codes_pkey primary key (id),
  constraint invite_codes_code_key unique (code)
);

-- Enable RLS
alter table public.invite_codes enable row level security;

-- Create policies
-- Only allow server-side (service role) to read/write freely
-- or allow unauthenticated read if checking for existence (but better to keep it hidden and use RPC or Edge Functions/API route)
-- For now, we will strictly manage this table via service role in our API route, 
-- but we grant select to authenticated users just in case we need to verify their own invite later.
-- Actually, strict security: Only Service Role should touch this table to prevent enumeration.

-- Grant access to postgres role (default) and service_role
grant all on public.invite_codes to service_role;
