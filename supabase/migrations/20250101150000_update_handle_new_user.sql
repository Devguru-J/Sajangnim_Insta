create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url,
    industry,
    store_name,
    phone,
    city,
    district
  )
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'industry',
    new.raw_user_meta_data->>'store_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'district'
  );
  return new;
end;
$$ language plpgsql security definer;
