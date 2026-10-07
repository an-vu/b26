ALTER TABLE boards
  ADD COLUMN appearance_theme VARCHAR(255) NOT NULL DEFAULT 'light',
  ADD COLUMN appearance_radius_step INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN appearance_background_color VARCHAR(255) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN appearance_pattern VARCHAR(255) NOT NULL DEFAULT 'none';

ALTER TABLE boards
  ADD CONSTRAINT boards_appearance_theme CHECK (appearance_theme IN ('light', 'dark')),
  ADD CONSTRAINT boards_appearance_radius CHECK (appearance_radius_step BETWEEN 1 AND 3),
  ADD CONSTRAINT boards_appearance_color CHECK (appearance_background_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT boards_appearance_pattern CHECK (appearance_pattern IN
    ('none', 'dots', 'grid', 'diagonal', 'reverse-diagonal', 'stripes', 'checkered'));
