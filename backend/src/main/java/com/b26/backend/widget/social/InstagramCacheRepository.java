package com.b26.backend.widget.social;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** PostgreSQL owns the refresh lease and budget so all backend instances share them. */
@Repository
public class InstagramCacheRepository {
  private static final Duration SUCCESS_TTL = Duration.ofHours(6);
  private static final Duration RETRY_TTL = Duration.ofMinutes(15);
  private final JdbcTemplate db;
  private final ObjectMapper mapper;

  public InstagramCacheRepository(JdbcTemplate db, ObjectMapper mapper) {
    this.db = db;
    this.mapper = mapper;
  }

  public Optional<InstagramProfile> findFresh(String username) {
    return db.query("""
        SELECT payload FROM instagram_profile_cache
        WHERE username = ? AND refresh_after > CURRENT_TIMESTAMP
        """, (rs, row) -> decode(rs.getString("payload")), username).stream().findFirst();
  }

  public boolean claimRefresh(String username) {
    return db.update("""
        INSERT INTO instagram_profile_cache(username, refresh_after)
        VALUES (?, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
        ON CONFLICT (username) DO UPDATE
        SET payload = EXCLUDED.payload, refresh_after = EXCLUDED.refresh_after
        WHERE instagram_profile_cache.refresh_after <= CURRENT_TIMESTAMP
        """, username) > 0;
  }

  public boolean claimDailyFetch(int limit) {
    return limit > 0 && db.update("""
        INSERT INTO instagram_fetch_budget(fetch_day, requests)
        VALUES ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, 1)
        ON CONFLICT(fetch_day) DO UPDATE
        SET requests = instagram_fetch_budget.requests + 1
        WHERE instagram_fetch_budget.requests < ?
        """, limit) > 0;
  }

  public void save(String username, InstagramProfile profile) throws JsonProcessingException {
    boolean cacheable = profile.status().equals("ready") || profile.status().equals("private");
    Instant expires = Instant.now().plus(cacheable ? SUCCESS_TTL : RETRY_TTL);
    db.update("UPDATE instagram_profile_cache SET payload = ?, refresh_after = ? WHERE username = ?",
        mapper.writeValueAsString(profile), Timestamp.from(expires), username);
  }

  private InstagramProfile decode(String payload) {
    try { return mapper.readValue(payload, InstagramProfile.class); }
    catch (JsonProcessingException ignored) { return InstagramProfile.state("unavailable"); }
  }
}
