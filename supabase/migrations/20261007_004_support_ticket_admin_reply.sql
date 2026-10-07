alter table public.support_tickets
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz;

create index if not exists support_tickets_status_created_idx
  on public.support_tickets(status, created_at desc);
