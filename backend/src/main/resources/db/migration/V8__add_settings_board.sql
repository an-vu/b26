insert into boards (id, board_name, board_url, name, headline, owner_user_id)
select 'settings', 'Settings', 'settings', 'Settings', 'Manage your account and app configuration', 'anvu'
where not exists (select 1 from boards where id = 'settings');

insert into widgets (board_id, type, title, layout, config_json, enabled, sort_order)
select 'settings',
       'link',
       'User Settings',
       'span-2',
       '{"url":"https://example.com/settings/user"}',
       true,
       0
where exists (select 1 from boards where id = 'settings')
  and not exists (
    select 1 from widgets where board_id = 'settings' and title = 'User Settings'
  );

insert into widgets (board_id, type, title, layout, config_json, enabled, sort_order)
select 'settings',
       'link',
       'Admin Settings',
       'span-2',
       '{"url":"https://example.com/settings/admin"}',
       true,
       1
where exists (select 1 from boards where id = 'settings')
  and not exists (
    select 1 from widgets where board_id = 'settings' and title = 'Admin Settings'
  );
