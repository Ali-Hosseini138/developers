alter table public.apps
  add column if not exists name_en text,
  add column if not exists tagline_en text,
  add column if not exists description_en text;
