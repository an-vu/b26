-- Store widget configuration as jsonb. Unparseable legacy text becomes {} (what the API already
-- returned for it) instead of failing the deploy.
CREATE OR REPLACE FUNCTION pg_temp.b26_config_jsonb(config text) RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
  RETURN config::jsonb;
EXCEPTION WHEN others THEN
  RETURN '{}'::jsonb;
END $$;

ALTER TABLE widgets ALTER COLUMN config_json TYPE jsonb USING pg_temp.b26_config_jsonb(config_json);

DROP FUNCTION pg_temp.b26_config_jsonb(text);
