update app_users
set username = lower(trim(username))
where username <> lower(trim(username));

update app_users
set role = upper(trim(role))
where role <> upper(trim(role));

do $$
begin
  if not exists (
    select 1
    from information_schema.check_constraints cc
    join information_schema.table_constraints tc
      on tc.constraint_name = cc.constraint_name
    where tc.table_name = 'app_users'
      and tc.constraint_type = 'CHECK'
      and tc.constraint_name = 'chk_app_users_role'
  ) then
    alter table app_users
      add constraint chk_app_users_role
      check (role in ('ADMIN', 'USER'));
  end if;
end $$;

create unique index if not exists uq_app_users_username_ci
  on app_users ((lower(username)));

insert into user_preferences (user_id, main_board_id)
select u.id, null
from app_users u
where not exists (
  select 1 from user_preferences p where p.user_id = u.id
);

update user_preferences
set main_board_id = 'default'
where user_id = 'anvu'
  and main_board_id is null
  and exists (select 1 from boards where id = 'default');

create index if not exists idx_user_preferences_main_board_id on user_preferences(main_board_id);
