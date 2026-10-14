package com.b26.backend.widget.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import java.time.*;
import java.util.concurrent.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class InstagramService {
  private final JdbcTemplate db;
  private final ObjectMapper mapper;
  private final InstagramProvider provider;
  private final int dailyLimit;
  private final ExecutorService worker = Executors.newSingleThreadExecutor();
  private final Semaphore slots = new Semaphore(8);
  public InstagramService(JdbcTemplate db, ObjectMapper mapper, InstagramProvider provider,
      @Value("${app.instagram.daily-fetch-limit:20}") int dailyLimit) {
    this.db = db; this.mapper = mapper; this.provider = provider; this.dailyLimit = Math.max(0, dailyLimit);
  }
  public InstagramProfile get(String username) {
    if (!provider.configured()) return InstagramProfile.state("not_configured");
    var rows = db.query("SELECT payload, refresh_after FROM instagram_profile_cache WHERE username = ?", (rs, n) -> new Object[]{rs.getString(1), rs.getTimestamp(2).toInstant()}, username);
    if (!rows.isEmpty() && ((Instant) rows.get(0)[1]).isAfter(Instant.now())) {
      try { return mapper.readValue((String) rows.get(0)[0], InstagramProfile.class); }
      catch (Exception ignored) { return InstagramProfile.state("unavailable"); }
    }
    if (!slots.tryAcquire()) return InstagramProfile.state("unavailable");
    try {
      // Atomic cross-instance lease: repeated page visits never queue duplicate paid runs.
      int claimed = db.update("INSERT INTO instagram_profile_cache(username, refresh_after) VALUES (?, CURRENT_TIMESTAMP + INTERVAL '15 minutes') ON CONFLICT (username) DO UPDATE SET payload = EXCLUDED.payload, refresh_after = EXCLUDED.refresh_after WHERE instagram_profile_cache.refresh_after <= CURRENT_TIMESTAMP", username);
      if (claimed == 0) { slots.release(); return InstagramProfile.state("loading"); }
      worker.submit(() -> refresh(username));
    } catch (RuntimeException error) { slots.release(); throw error; }
    return InstagramProfile.state("loading");
  }
  private void refresh(String username) {
    InstagramProfile result = InstagramProfile.state("unavailable");
    try {
      // Durable daily request budget, shared by all backend instances (UTC database day).
      int allowed = dailyLimit == 0 ? 0 : db.update("INSERT INTO instagram_fetch_budget(fetch_day, requests) VALUES ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, 1) ON CONFLICT(fetch_day) DO UPDATE SET requests = instagram_fetch_budget.requests + 1 WHERE instagram_fetch_budget.requests < ?", dailyLimit);
      if (allowed > 0) result = provider.fetch(username);
    } catch (Exception error) { if (error instanceof InterruptedException) Thread.currentThread().interrupt(); }
    finally {
      try {
        int minutes = cacheable(result) ? 360 : 15;
        db.update("UPDATE instagram_profile_cache SET payload = ?, refresh_after = ? WHERE username = ?",
            mapper.writeValueAsString(result), java.sql.Timestamp.from(Instant.now().plusSeconds(minutes * 60L)), username);
      } catch (Exception ignored) { /* Lease expires even if persistence fails. Never log credentials or provider bodies. */ }
      slots.release();
    }
  }
  private static boolean cacheable(InstagramProfile result) { return result.status().equals("ready") || result.status().equals("private"); }
  @PreDestroy void close() { worker.shutdownNow(); }
}
