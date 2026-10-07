-- Retain old stored patterns for compatibility; the picker exposes none/dots/grid/rainfall.
ALTER TABLE boards DROP CONSTRAINT boards_appearance_pattern;
ALTER TABLE boards ADD CONSTRAINT boards_appearance_pattern
  CHECK (appearance_pattern IN ('none', 'dots', 'grid', 'diagonal', 'reverse-diagonal', 'stripes', 'checkered', 'rainfall'));
