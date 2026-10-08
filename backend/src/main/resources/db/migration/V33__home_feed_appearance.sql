ALTER TABLE user_preferences ADD COLUMN home_radius_step INTEGER NOT NULL DEFAULT 2;
ALTER TABLE user_preferences ADD COLUMN home_spacing_step INTEGER NOT NULL DEFAULT 2;
ALTER TABLE user_preferences ADD CONSTRAINT chk_home_radius_step CHECK (home_radius_step BETWEEN 1 AND 3);
ALTER TABLE user_preferences ADD CONSTRAINT chk_home_spacing_step CHECK (home_spacing_step BETWEEN 1 AND 3);
