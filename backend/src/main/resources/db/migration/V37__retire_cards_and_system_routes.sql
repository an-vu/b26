-- Preserve retired data for recovery/audit, detached from active board lifecycles.
ALTER TABLE cards RENAME TO legacy_cards;
ALTER TABLE system_settings RENAME TO legacy_system_settings;
DO $$
DECLARE entry record;
BEGIN
  FOR entry IN
    SELECT conrelid::regclass AS relation, conname FROM pg_constraint
    WHERE contype = 'f' AND connamespace = current_schema()::regnamespace
      AND conrelid IN ('legacy_cards'::regclass, 'legacy_system_settings'::regclass)
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', entry.relation, entry.conname);
  END LOOP;
END $$;

-- Namespaced targets distinguish historical cards from current widgets.
ALTER TABLE click_events RENAME COLUMN card_id TO target_id;
ALTER TABLE click_events ALTER COLUMN target_id TYPE varchar(512);
UPDATE click_events SET target_id = 'card:' || target_id;
CREATE INDEX idx_boards_public_name ON boards (lower(board_name), id) WHERE visibility = 'public';
