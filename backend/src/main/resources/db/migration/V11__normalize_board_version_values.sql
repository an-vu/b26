update boards
set version = 0
where version is null;

alter table boards
  alter column version set default 0;
