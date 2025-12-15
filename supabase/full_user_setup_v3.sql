-- 1. Create table for public profiles matching auth.users
create table if not exists public.app_users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  user_metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_sign_in_at timestamp with time zone,
  
  constraint app_users_email_key unique(email)
);

-- 2. Enable RLS
alter table public.app_users enable row level security;

-- 3. Create policies
create policy "Users can view their own profile."
  on public.app_users for select
  using ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.app_users for update
  using ( auth.uid() = id );

-- 4. Create trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.app_users (id, email, user_metadata, created_at, last_sign_in_at)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data,  -- Corrected column name
    new.created_at,
    new.last_sign_in_at
  );
  return new;
end;
$$;

-- 5. Create trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Backfill existing users
insert into public.app_users (id, email, user_metadata, created_at, last_sign_in_at)
select 
  id, 
  email, 
  raw_user_meta_data,  -- Corrected column name
  created_at,
  last_sign_in_at
from auth.users
on conflict (id) do nothing;

-- 7. Verification: Return count
select count(*) as total_users from public.app_users;
