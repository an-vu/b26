alter table app_users
  add column if not exists password_hash varchar(100);

create unique index if not exists uq_app_users_email_ci
  on app_users ((lower(email)))
  where email is not null;

create table if not exists auth_sessions (
  id varchar(64) primary key,
  user_id varchar(64) not null,
  token_hash char(64) not null unique,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  revoked_at timestamp with time zone,
  constraint fk_auth_sessions_user
    foreign key (user_id) references app_users(id) on delete cascade
);

create index if not exists idx_auth_sessions_user_id on auth_sessions(user_id);
create index if not exists idx_auth_sessions_expires_at on auth_sessions(expires_at);
