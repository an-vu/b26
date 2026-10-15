-- Theme, pattern, intensity and color-mode vocabularies are validated by the API (AppearanceRules),
-- so adding a theme or pattern no longer needs a schema migration. Numeric ranges, the color
-- format and board visibility remain enforced here.
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_appearance_theme;
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_appearance_theme_family;
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_appearance_pattern;
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_pattern_intensity;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS chk_home_theme_family;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS chk_home_color_mode;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS chk_home_pattern;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS chk_home_pattern_intensity;
