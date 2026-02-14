-- Ensure an insights board exists when legacy analytics board exists.
insert into boards (id, board_name, board_url, name, headline, version)
select 'insights', board_name, 'insights', name, headline, version
from boards
where id = 'analytics'
  and not exists (select 1 from boards where id = 'insights');

-- Move all relations/events from analytics -> insights.
update cards
set board_id = 'insights'
where board_id = 'analytics'
  and exists (select 1 from boards where id = 'insights');

update widgets
set board_id = 'insights'
where board_id = 'analytics'
  and exists (select 1 from boards where id = 'insights');

update click_events
set board_id = 'insights'
where board_id = 'analytics';

update view_events
set board_id = 'insights'
where board_id = 'analytics';

-- Remove legacy analytics board row once references are moved.
delete from boards
where id = 'analytics'
  and exists (select 1 from boards where id = 'insights');

-- Normalize board URL and label for the new identity.
update boards
set board_url = 'insights'
where id = 'insights';

update boards
set board_name = 'Insights'
where id = 'insights'
  and board_name = 'Analytics';

