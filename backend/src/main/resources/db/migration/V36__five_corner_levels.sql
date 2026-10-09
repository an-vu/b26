ALTER TABLE boards DROP CONSTRAINT boards_appearance_radius;
ALTER TABLE boards ADD CONSTRAINT boards_appearance_radius CHECK (appearance_radius_step BETWEEN 1 AND 5);
ALTER TABLE user_preferences DROP CONSTRAINT chk_home_radius_step;
ALTER TABLE user_preferences ADD CONSTRAINT chk_home_radius_step CHECK (home_radius_step BETWEEN 1 AND 5);
