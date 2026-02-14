insert into boards (id, board_name, board_url, name, headline, version)
select 'analytics', 'Analytics', 'analytics', 'Analytics', 'Overview of your profile performance', 0
where not exists (select 1 from boards where id = 'analytics');

