-- Row Level Security for NetStore developer data.
-- RLS means the database itself enforces ownership, even if a client bypasses the UI.

alter table public.profiles enable row level security;
alter table public.apps enable row level security;
alter table public.app_versions enable row level security;
alter table public.support_tickets enable row level security;

-- Profiles: users can only read and edit their own profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Apps: owners can manage their own apps. Published apps remain readable for the storefront.
drop policy if exists apps_select_visible on public.apps;
create policy apps_select_visible
on public.apps
for select
to anon, authenticated
using (status = 'published' or owner_id = auth.uid());

drop policy if exists apps_insert_own on public.apps;
create policy apps_insert_own
on public.apps
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists apps_update_own on public.apps;
create policy apps_update_own
on public.apps
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists apps_delete_own on public.apps;
create policy apps_delete_own
on public.apps
for delete
to authenticated
using (owner_id = auth.uid());

-- Versions: access is inherited from the parent app.
drop policy if exists app_versions_select_own on public.app_versions;
create policy app_versions_select_own
on public.app_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.apps
    where apps.id = app_versions.app_id
      and apps.owner_id = auth.uid()
  )
);

drop policy if exists app_versions_insert_own on public.app_versions;
create policy app_versions_insert_own
on public.app_versions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.apps
    where apps.id = app_versions.app_id
      and apps.owner_id = auth.uid()
  )
);

drop policy if exists app_versions_update_own on public.app_versions;
create policy app_versions_update_own
on public.app_versions
for update
to authenticated
using (
  exists (
    select 1
    from public.apps
    where apps.id = app_versions.app_id
      and apps.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.apps
    where apps.id = app_versions.app_id
      and apps.owner_id = auth.uid()
  )
);

drop policy if exists app_versions_delete_own on public.app_versions;
create policy app_versions_delete_own
on public.app_versions
for delete
to authenticated
using (
  exists (
    select 1
    from public.apps
    where apps.id = app_versions.app_id
      and apps.owner_id = auth.uid()
  )
);

-- Support tickets: users can only create and read their own tickets.
drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own
on public.support_tickets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own
on public.support_tickets
for insert
to authenticated
with check (user_id = auth.uid());
