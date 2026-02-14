alter table boards add column if not exists board_name varchar(255);

update boards
set board_name = name
where board_name is null or trim(board_name) = '';

alter table boards alter column board_name set not null;
