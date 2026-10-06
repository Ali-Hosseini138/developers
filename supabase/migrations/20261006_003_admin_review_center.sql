alter table public.apps
  add column if not exists review_reason text,
  add column if not exists reviewed_at timestamptz;

alter table public.app_versions
  add column if not exists review_reason text,
  add column if not exists reviewed_at timestamptz;

create table if not exists public.review_submissions (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  version_id uuid references public.app_versions(id) on delete cascade,
  request_type text not null check (request_type in ('app','version')),
  submitted_by uuid not null,
  snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists review_submissions_app_id_idx on public.review_submissions(app_id, submitted_at desc);
create index if not exists review_submissions_version_id_idx on public.review_submissions(version_id);
create index if not exists review_submissions_status_idx on public.review_submissions(status, submitted_at desc);

alter table public.review_submissions enable row level security;

drop policy if exists "owners can read own review submissions" on public.review_submissions;
create policy "owners can read own review submissions"
on public.review_submissions for select to authenticated
using (submitted_by = auth.uid());

drop policy if exists "owners can create own review submissions" on public.review_submissions;
create policy "owners can create own review submissions"
on public.review_submissions for insert to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1 from public.apps
    where apps.id = review_submissions.app_id
      and apps.owner_id = auth.uid()
  )
);
