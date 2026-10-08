ALTER TABLE boards DROP CONSTRAINT boards_appearance_theme_family;
ALTER TABLE boards ADD CONSTRAINT boards_appearance_theme_family
  CHECK (appearance_theme_family IN ('default', 'frutiger-aero', 'aqua', 'omahakase', 'kiwi', 'lofi'));
ALTER TABLE user_preferences DROP CONSTRAINT chk_home_theme_family;
ALTER TABLE user_preferences ADD CONSTRAINT chk_home_theme_family
  CHECK (home_theme_family IN ('default', 'frutiger-aero', 'aqua', 'omahakase', 'kiwi', 'lofi'));
