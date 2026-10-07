ALTER TABLE boards
  ADD COLUMN appearance_theme_family VARCHAR(255) NOT NULL DEFAULT 'default';

ALTER TABLE boards
  ADD CONSTRAINT boards_appearance_theme_family
  CHECK (appearance_theme_family IN ('default', 'frutiger-aero'));
