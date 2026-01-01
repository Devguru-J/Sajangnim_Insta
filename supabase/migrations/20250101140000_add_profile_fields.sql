-- Add new columns to profiles table
alter table public.profiles
add column if not exists industry text,
add column if not exists store_name text,
add column if not exists phone text,
add column if not exists city text,
add column if not exists district text;
