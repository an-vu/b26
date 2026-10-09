ALTER TABLE boards DROP CONSTRAINT boards_appearance_pattern;
ALTER TABLE boards ADD CONSTRAINT boards_appearance_pattern CHECK (appearance_pattern IN
 ('none', 'dots', 'grid', 'diagonal', 'reverse-diagonal', 'stripes', 'checkered', 'rainfall', 'stars', 'snow', 'sakura', 'wave', 'lava', 'bokeh'));
ALTER TABLE user_preferences DROP CONSTRAINT chk_home_pattern;
ALTER TABLE user_preferences ADD CONSTRAINT chk_home_pattern CHECK (home_pattern IN
 ('none', 'dots', 'grid', 'diagonal', 'reverse-diagonal', 'stripes', 'checkered', 'rainfall', 'stars', 'snow', 'sakura', 'wave', 'lava', 'bokeh'));
