update system_settings
set global_signup_board_id = coalesce(global_signin_board_id, 'signin')
where global_signup_board_id is null
   or global_signup_board_id = 'signup';

delete from widgets where board_id = 'signup';
delete from boards where id = 'signup';
