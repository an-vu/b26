do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'system_settings'
      and column_name = 'global_main_board_id'
  ) then
    alter table system_settings
      rename column global_main_board_id to global_homepage_board_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'system_settings'
      and constraint_name = 'fk_system_settings_main_board'
  ) then
    alter table system_settings
      rename constraint fk_system_settings_main_board to fk_system_settings_homepage_board;
  end if;
end $$;
