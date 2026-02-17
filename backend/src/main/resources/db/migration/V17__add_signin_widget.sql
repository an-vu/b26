insert into widgets (board_id, type, title, layout, config_json, enabled, sort_order)
select 'signin', 'signin', 'Welcome Back!', 'span-2', '{}', true, 0
where exists (select 1 from boards where id = 'signin')
  and not exists (
    select 1
    from widgets
    where board_id = 'signin'
      and type = 'signin'
  );
