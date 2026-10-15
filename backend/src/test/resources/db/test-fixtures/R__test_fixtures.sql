-- Test-only data layered on the B21/V* seed (anvu plus the default, home, insights, settings and
-- signin boards). Repeatable, so it is applied after every clean migrate in the test profile.
INSERT INTO boards (id, board_name, board_url, name, headline, owner_user_id) VALUES
  ('berkshire', 'Berkshire', 'berkshire', 'An Vu', 'Software Engineering - Angular + Spring Boot', 'anvu'),
  ('union-pacific', 'Union Pacific', 'union-pacific', 'An Vu', 'Software Engineering - Angular + Java', 'anvu');

INSERT INTO widgets (board_id, type, title, layout, config_json, enabled, sort_order) VALUES
  ('default', 'embed', 'Now Playing', 'span-2', '{"embedUrl":"https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC"}', true, 0),
  ('default', 'map', 'Places Visited', 'span-2', '{"places":["Omaha, NE","Chicago, IL","San Francisco, CA"]}', true, 1),
  ('default', 'link', 'GitHub', 'span-1', '{"url":"https://github.com/"}', true, 2),
  ('berkshire', 'link', 'LinkedIn', 'span-1', '{"url":"https://linkedin.com/"}', true, 0);
