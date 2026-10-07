ALTER TABLE boards ADD COLUMN appearance_pattern_intensity VARCHAR(255) NOT NULL DEFAULT 'light';
ALTER TABLE boards ADD CONSTRAINT boards_pattern_intensity CHECK (appearance_pattern_intensity IN ('light', 'medium', 'heavy'));
ALTER TABLE boards DROP CONSTRAINT boards_appearance_pattern;
ALTER TABLE boards ADD CONSTRAINT boards_appearance_pattern CHECK (appearance_pattern IN
  ('none', 'dots', 'grid', 'diagonal', 'reverse-diagonal', 'stripes', 'checkered', 'rainfall', 'stars', 'snow', 'sakura', 'wave'));
