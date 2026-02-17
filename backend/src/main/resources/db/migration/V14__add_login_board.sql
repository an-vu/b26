insert into boards (id, board_name, board_url, name, headline, owner_user_id)
select 'login', 'Login', 'login-board', 'Login', 'Sign in to manage your board', 'anvu'
where not exists (select 1 from boards where id = 'login');
