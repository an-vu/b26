-- Preserve existing public links; new boards default to private in application code.
ALTER TABLE boards ADD COLUMN visibility varchar(7) NOT NULL DEFAULT 'public';
ALTER TABLE boards ADD CONSTRAINT ck_board_visibility CHECK (visibility IN ('public', 'private'));
