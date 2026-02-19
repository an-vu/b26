alter table boards
  add column if not exists updated_at timestamp with time zone not null default now();

update boards
set updated_at = coalesce(updated_at, now())
where updated_at is null;
