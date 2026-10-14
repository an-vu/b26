package com.b26.backend.widget.social;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Coordinates bounded background refreshes; persistence and provider I/O live separately. */
@Service
public class InstagramService {
  private final InstagramCacheRepository cache;
  private final InstagramProvider provider;
  private final int dailyLimit;
  private final ExecutorService worker = Executors.newSingleThreadExecutor();
  private final Semaphore slots = new Semaphore(8);

  public InstagramService(InstagramCacheRepository cache, InstagramProvider provider,
      @Value("${app.instagram.daily-fetch-limit:20}") int dailyLimit) {
    this.cache = cache;
    this.provider = provider;
    this.dailyLimit = Math.max(0, dailyLimit);
  }

  public InstagramProfile get(String username) {
    if (!provider.configured()) return InstagramProfile.state("not_configured");
    var cached = cache.findFresh(username);
    if (cached.isPresent()) return cached.get();
    if (!slots.tryAcquire()) return InstagramProfile.state("unavailable");
    try {
      if (!cache.claimRefresh(username)) {
        slots.release();
        return InstagramProfile.state("loading");
      }
      worker.submit(() -> refresh(username));
    } catch (RuntimeException error) {
      slots.release();
      throw error;
    }
    return InstagramProfile.state("loading");
  }

  private void refresh(String username) {
    InstagramProfile result = InstagramProfile.state("unavailable");
    try {
      if (cache.claimDailyFetch(dailyLimit)) result = provider.fetch(username);
    } catch (Exception error) {
      if (error instanceof InterruptedException) Thread.currentThread().interrupt();
    } finally {
      try { cache.save(username, result); }
      catch (Exception ignored) { /* Lease expires if persistence fails. Never log credentials or provider bodies. */ }
      slots.release();
    }
  }

  @PreDestroy void close() { worker.shutdownNow(); }
}
