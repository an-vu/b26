ALTER TABLE boards ADD COLUMN appearance_spacing_step INTEGER NOT NULL DEFAULT 2 CHECK (appearance_spacing_step BETWEEN 1 AND 3);
