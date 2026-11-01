create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at_column();

-- Resumes uploaded by users (onboarding gate + resume library).
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz default now()
);

alter table public.resumes enable row level security;

drop policy if exists "Users can view their own resumes" on public.resumes;
create policy "Users can view their own resumes"
on public.resumes for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own resumes" on public.resumes;
create policy "Users can insert their own resumes"
on public.resumes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own resumes" on public.resumes;
create policy "Users can update their own resumes"
on public.resumes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own resumes" on public.resumes;
create policy "Users can delete their own resumes"
on public.resumes for delete
using (auth.uid() = user_id);

-- Private storage bucket for resume files. Objects are stored under
-- `{user_id}/...` paths; the policies below scope every operation to
-- the authenticated owner of that folder.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "Users can view their own resume files" on storage.objects;
create policy "Users can view their own resume files"
on storage.objects for select
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their own resume files" on storage.objects;
create policy "Users can upload their own resume files"
on storage.objects for insert
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own resume files" on storage.objects;
create policy "Users can update their own resume files"
on storage.objects for update
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own resume files" on storage.objects;
create policy "Users can delete their own resume files"
on storage.objects for delete
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- Parsed-resume profile details (auto-populated by Gemini, user-editable).
alter table public.profiles
  add column if not exists headline text,
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists professional_summary text,
  add column if not exists additional_info text,
  add column if not exists skills jsonb not null default '[]'::jsonb,
  add column if not exists work_experience jsonb not null default '[]'::jsonb,
  add column if not exists education jsonb not null default '[]'::jsonb,
  add column if not exists projects jsonb not null default '[]'::jsonb,
  add column if not exists certifications jsonb not null default '[]'::jsonb,
  add column if not exists links jsonb not null default '[]'::jsonb;

-- One extraction record per resume; upserted on re-parse.
create table if not exists public.resume_extractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null unique references public.resumes(id) on delete cascade,
  status text not null check (status in ('succeeded', 'failed')),
  error text,
  extracted_data jsonb,
  model text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.resume_extractions enable row level security;

drop policy if exists "Users can view their own resume extractions" on public.resume_extractions;
create policy "Users can view their own resume extractions"
on public.resume_extractions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own resume extractions" on public.resume_extractions;
create policy "Users can insert their own resume extractions"
on public.resume_extractions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own resume extractions" on public.resume_extractions;
create policy "Users can update their own resume extractions"
on public.resume_extractions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists resume_extractions_updated_at on public.resume_extractions;
create trigger resume_extractions_updated_at
before update on public.resume_extractions
for each row execute procedure public.update_updated_at_column();
