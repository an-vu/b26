alter table system_settings
  add column if not exists global_login_board_id varchar(255);

update system_settings
set global_login_board_id = 'login'
where global_login_board_id is null;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'system_settings'
      and constraint_name = 'fk_system_settings_login_board'
  ) then
    alter table system_settings
      add constraint fk_system_settings_login_board
      foreign key (global_login_board_id) references boards(id);
  end if;
end $$;

alter table system_settings
  alter column global_login_board_id set not null;
