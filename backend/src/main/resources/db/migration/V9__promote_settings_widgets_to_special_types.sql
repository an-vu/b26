update widgets
set type = 'user-settings',
    layout = 'span-4',
    config_json = '{}'
where board_id = 'settings'
  and title = 'User Settings';

update widgets
set type = 'admin-settings',
    layout = 'span-4',
    config_json = '{}'
where board_id = 'settings'
  and title = 'Admin Settings';
