insert into boards (id, board_name, board_url, name, headline, version, owner_user_id)
select
  'signin',
  board_name,
  case
    when exists (select 1 from boards where board_url = 'signin-board')
      then 'signin-board-login'
    else 'signin-board'
  end,
  name,
  headline,
  version,
  owner_user_id
from boards
where id = 'login'
  and not exists (select 1 from boards where id = 'signin');

insert into boards (id, board_name, board_url, name, headline, version, owner_user_id)
select 'signin', 'Sign In', 'signin-board', 'Sign In', 'Sign in to manage your board', 0, u.id
from app_users u
where not exists (select 1 from boards where id = 'signin')
order by u.id
limit 1;

update cards
set board_id = 'signin'
where board_id = 'login'
  and exists (select 1 from boards where id = 'signin');

update widgets
set board_id = 'signin'
where board_id = 'login'
  and exists (select 1 from boards where id = 'signin');

update click_events
set board_id = 'signin'
where board_id = 'login';

update view_events
set board_id = 'signin'
where board_id = 'login';

update user_preferences
set main_board_id = 'signin'
where main_board_id = 'login'
  and exists (select 1 from boards where id = 'signin');

alter table system_settings
  add column if not exists global_signin_board_id varchar(255);

update system_settings
set global_signin_board_id =
  coalesce(global_signin_board_id, global_login_board_id, 'signin')
where global_signin_board_id is null;

update system_settings
set global_signin_board_id = 'signin'
where global_signin_board_id = 'login'
  and exists (select 1 from boards where id = 'signin');

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'system_settings'
      and constraint_name = 'fk_system_settings_signin_board'
  ) then
    alter table system_settings
      add constraint fk_system_settings_signin_board
      foreign key (global_signin_board_id) references boards(id);
  end if;
end $$;

alter table system_settings
  alter column global_signin_board_id set not null;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'system_settings'
      and constraint_name = 'fk_system_settings_login_board'
  ) then
    alter table system_settings
      drop constraint fk_system_settings_login_board;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'system_settings'
      and column_name = 'global_login_board_id'
  ) then
    alter table system_settings
      drop column global_login_board_id;
  end if;
end $$;

delete from boards
where id = 'login'
  and exists (select 1 from boards where id = 'signin');

update boards
set board_name = 'Sign In',
    board_url = 'signin-board'
where id = 'signin'
  and not exists (select 1 from boards where board_url = 'signin-board' and id <> 'signin');
