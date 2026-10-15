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

  /** A cached payload; stale entries are still served while a refresh is pending or after it fails. */
  public record Cached(InstagramProfile profile, boolean fresh) {}

  public Optional<Cached> find(String username) {
    return db.query("""
        SELECT payload, refresh_after > CURRENT_TIMESTAMP AS fresh FROM instagram_profile_cache
        WHERE username = ?
        """, (rs, row) -> new Cached(decode(rs.getString("payload")), rs.getBoolean("fresh")), username)
        .stream().findFirst();
  }

  /** Takes the refresh lease. The previous payload stays in place until a refresh replaces it. */
  public boolean claimRefresh(String username) {
    return db.update("""
        INSERT INTO instagram_profile_cache(username, refresh_after)
        VALUES (?, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
        ON CONFLICT (username) DO UPDATE
        SET refresh_after = EXCLUDED.refresh_after
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

  /**
   * Stores a usable result for SUCCESS_TTL. Anything else schedules a retry and keeps the last
   * usable payload, so a failed fetch or an exhausted budget never replaces good data.
   */
  public void save(String username, InstagramProfile profile) throws JsonProcessingException {
    if (isUsable(profile)) {
      db.update("UPDATE instagram_profile_cache SET payload = ?, refresh_after = ? WHERE username = ?",
          mapper.writeValueAsString(profile), Timestamp.from(Instant.now().plus(SUCCESS_TTL)), username);
      return;
    }
    db.update("""
        UPDATE instagram_profile_cache
        SET payload = CASE WHEN payload::jsonb ->> 'status' IN ('ready', 'private') THEN payload ELSE ? END,
            refresh_after = ?
        WHERE username = ?
        """, mapper.writeValueAsString(profile), Timestamp.from(Instant.now().plus(RETRY_TTL)), username);
  }

  static boolean isUsable(InstagramProfile profile) {
    return profile.status().equals("ready") || profile.status().equals("private");
  }

  private InstagramProfile decode(String payload) {
    try { return mapper.readValue(payload, InstagramProfile.class); }
    catch (JsonProcessingException ignored) { return InstagramProfile.state("unavailable"); }
  }
}
