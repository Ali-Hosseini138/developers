alter table public.profiles
  add column if not exists organization text;

alter table public.apps
  add column if not exists netbox_payment_grace_accepted boolean not null default false,
  add column if not exists netbox_payment_grace_deadline timestamptz;
