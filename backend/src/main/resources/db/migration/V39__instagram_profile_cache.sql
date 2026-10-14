CREATE TABLE instagram_profile_cache (
  username VARCHAR(30) PRIMARY KEY,
  payload TEXT NOT NULL DEFAULT '{"status":"loading","followersCount":null,"posts":[]}',
  refresh_after TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE instagram_fetch_budget (
  fetch_day DATE PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0
);
