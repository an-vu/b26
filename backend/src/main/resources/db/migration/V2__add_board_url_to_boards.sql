alter table boards add column if not exists board_url varchar(255);

update boards
set board_url = id
where board_url is null or trim(board_url) = '';

alter table boards alter column board_url set not null;

create unique index if not exists uq_boards_board_url on boards(board_url);
