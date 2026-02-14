create table if not exists app_users (
  id varchar(255) primary key,
  username varchar(255) not null unique,
  email varchar(320),
  role varchar(32) not null
);

insert into app_users (id, username, email, role)
values ('anvu', 'anvu', 'anvu@local', 'ADMIN')
on conflict (id) do nothing;

alter table boards add column if not exists owner_user_id varchar(255);
update boards
set owner_user_id = 'anvu'
where owner_user_id is null;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'boards'
      and constraint_name = 'fk_boards_owner_user'
  ) then
    alter table boards
      add constraint fk_boards_owner_user
      foreign key (owner_user_id) references app_users(id);
  end if;
end $$;

alter table boards alter column owner_user_id set not null;
create index if not exists idx_boards_owner_user_id on boards(owner_user_id);

create table if not exists user_preferences (
  user_id varchar(255) primary key,
  main_board_id varchar(255),
  constraint fk_user_preferences_user
    foreign key (user_id) references app_users(id) on delete cascade,
  constraint fk_user_preferences_main_board
    foreign key (main_board_id) references boards(id) on delete set null
);

insert into user_preferences (user_id, main_board_id)
values ('anvu', 'default')
on conflict (user_id) do nothing;

create table if not exists system_settings (
  id smallint primary key,
  global_main_board_id varchar(255) not null,
  global_insights_board_id varchar(255) not null,
  updated_at timestamp with time zone not null default now(),
  constraint chk_system_settings_singleton check (id = 1),
  constraint fk_system_settings_main_board
    foreign key (global_main_board_id) references boards(id),
  constraint fk_system_settings_insights_board
    foreign key (global_insights_board_id) references boards(id)
);
