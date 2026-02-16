alter table app_users
  add column if not exists display_name varchar(255);

update app_users
set display_name = case
  when id = 'anvu' then 'An Vu'
  else username
end
where display_name is null or trim(display_name) = '';

alter table app_users
  alter column display_name set not null;
