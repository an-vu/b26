-- Rename theme family ids: default -> berry, frutiger-aero -> aero, omahakase -> omakase,
-- lofi -> valencia. aqua and kiwi are unchanged. The API still accepts the old ids as aliases
-- (AppearanceRules.normalizeThemeFamily). Theme-family CHECK constraints were dropped in V40.
UPDATE boards SET appearance_theme_family = CASE appearance_theme_family
    WHEN 'default' THEN 'berry'
    WHEN 'frutiger-aero' THEN 'aero'
    WHEN 'omahakase' THEN 'omakase'
    WHEN 'lofi' THEN 'valencia'
  END
WHERE appearance_theme_family IN ('default', 'frutiger-aero', 'omahakase', 'lofi');

UPDATE user_preferences SET home_theme_family = CASE home_theme_family
    WHEN 'default' THEN 'berry'
    WHEN 'frutiger-aero' THEN 'aero'
    WHEN 'omahakase' THEN 'omakase'
    WHEN 'lofi' THEN 'valencia'
  END
WHERE home_theme_family IN ('default', 'frutiger-aero', 'omahakase', 'lofi');

ALTER TABLE boards ALTER COLUMN appearance_theme_family SET DEFAULT 'berry';
ALTER TABLE user_preferences ALTER COLUMN home_theme_family SET DEFAULT 'berry';

-- Defensive: no theme-family CHECK constraint should survive V40.
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_appearance_theme_family;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS chk_home_theme_family;
