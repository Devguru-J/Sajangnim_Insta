-- Add detailed address column to profiles table
alter table public.profiles
add column if not exists detail_address text;
