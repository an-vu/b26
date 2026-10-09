package com.b26.backend.insights.domain;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Bounded, per-instance duplicate suppression. Reject new keys when the window is full. */
@Component
public class ClickAbuseGuard {
  private static final Duration WINDOW = Duration.ofSeconds(2);
  private record Key(String ip, String boardId, String targetId) {}
  private final Map<Key, Instant> accepted = new LinkedHashMap<>();
  private final Clock clock;
  private final int capacity;

  public ClickAbuseGuard() {
    this(Clock.systemUTC(), 10_000);
  }

  ClickAbuseGuard(Clock clock, int capacity) {
    if (capacity < 1) throw new IllegalArgumentException("capacity must be positive");
    this.clock = clock;
    this.capacity = capacity;
  }

  public synchronized boolean shouldAccept(String ip, String boardId, String targetId) {
    Instant now = clock.instant();
    // Insertion order is acceptance order; only scan expired entries at the front.
    var iterator = accepted.entrySet().iterator();
    while (iterator.hasNext()) {
      if (iterator.next().getValue().plus(WINDOW).isAfter(now)) break;
      iterator.remove();
    }
    Key key = new Key(ip, boardId, targetId);
    if (accepted.containsKey(key) || accepted.size() >= capacity) return false;
    accepted.put(key, now);
    return true;
  }

  public synchronized void clear() {
    accepted.clear();
  }
}
