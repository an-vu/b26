insert into boards (id, board_name, board_url, name, headline, version, owner_user_id)
select
  'signup',
  'Sign Up',
  case
    when exists (select 1 from boards where board_url = 'signup-board') then 'signup-board-v2'
    else 'signup-board'
  end,
  'Create Account',
  'Create an account to manage your board',
  0,
  u.id
from app_users u
where u.id = 'anvu'
  and not exists (select 1 from boards where id = 'signup')
limit 1;

insert into widgets (board_id, type, title, layout, config_json, enabled, sort_order)
select 'signup', 'signup', 'Create Your Account', 'span-2', '{}', true, 0
where exists (select 1 from boards where id = 'signup')
  and not exists (
    select 1
    from widgets
    where board_id = 'signup'
      and type = 'signup'
  );

alter table system_settings
  add column if not exists global_signup_board_id varchar(255);

update system_settings
set global_signup_board_id = coalesce(global_signup_board_id, 'signup')
where global_signup_board_id is null;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'system_settings'
      and constraint_name = 'fk_system_settings_signup_board'
  ) then
    alter table system_settings
      add constraint fk_system_settings_signup_board
      foreign key (global_signup_board_id) references boards(id);
  end if;
end $$;

alter table system_settings
  alter column global_signup_board_id set not null;
