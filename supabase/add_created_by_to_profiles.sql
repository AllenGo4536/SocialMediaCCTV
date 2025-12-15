-- Add created_by column to profiles table
alter table public.profiles 
add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Add comment
comment on column public.profiles.created_by is 'User ID of the person who added this profile';

-- Enable RLS if not already enabled (it should be, but just in case)
-- alter table public.profiles enable row level security;
