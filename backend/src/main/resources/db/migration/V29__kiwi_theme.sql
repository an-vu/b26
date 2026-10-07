ALTER TABLE boards DROP CONSTRAINT boards_appearance_theme_family;
ALTER TABLE boards ADD CONSTRAINT boards_appearance_theme_family
  CHECK (appearance_theme_family IN ('default', 'frutiger-aero', 'aqua', 'omahakase', 'kiwi'));
