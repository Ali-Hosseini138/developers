alter table public.apps
  add column if not exists has_in_app_payment boolean not null default false,
  add column if not exists netbox_payment_integrated boolean not null default false,
  add column if not exists developed_for_android_tv boolean not null default true,
  add column if not exists air_mouse_compatible boolean not null default false;

create table if not exists public.app_daily_installs (
  app_id uuid not null references public.apps(id) on delete cascade,
  metric_date date not null,
  installs integer not null default 0 check (installs >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (app_id, metric_date)
);

create table if not exists public.app_daily_sales (
  app_id uuid not null references public.apps(id) on delete cascade,
  metric_date date not null,
  orders integer not null default 0 check (orders >= 0),
  total_sales_rial bigint not null default 0 check (total_sales_rial >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (app_id, metric_date)
);

alter table public.app_daily_installs enable row level security;
alter table public.app_daily_sales enable row level security;

drop policy if exists "owners can read app daily installs" on public.app_daily_installs;
create policy "owners can read app daily installs"
on public.app_daily_installs
for select
to authenticated
using (
  exists (
    select 1
    from public.apps
    where apps.id = app_daily_installs.app_id
      and apps.owner_id = auth.uid()
  )
);

drop policy if exists "owners can read app daily sales" on public.app_daily_sales;
create policy "owners can read app daily sales"
on public.app_daily_sales
for select
to authenticated
using (
  exists (
    select 1
    from public.apps
    where apps.id = app_daily_sales.app_id
      and apps.owner_id = auth.uid()
  )
);
