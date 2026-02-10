package com.bento26.backend.analytics.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class ClickAbuseGuard {
  private static final Duration WINDOW = Duration.ofSeconds(2);
  private final Map<String, Instant> lastAccepted = new ConcurrentHashMap<>();

  public boolean shouldAccept(String ipAddress, String profileId, String cardId) {
    Instant now = Instant.now();
    String key = ipAddress + "|" + profileId + "|" + cardId;
    Instant previous = lastAccepted.get(key);
    if (previous != null && Duration.between(previous, now).compareTo(WINDOW) < 0) {
      return false;
    }
    lastAccepted.put(key, now);
    return true;
  }

  public void clear() {
    lastAccepted.clear();
  }
}
