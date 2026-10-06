-- V20 removed the signup board; its required route column must also be removed.
alter table system_settings drop column if exists global_signup_board_id;
