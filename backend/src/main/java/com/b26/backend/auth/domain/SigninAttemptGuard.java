package com.b26.backend.auth.domain;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Bounded, per-instance throttle for failed sign-ins, keyed by normalized email and client IP.
 * Each key gets a fixed window starting at its first failure. When full, new keys go untracked
 * rather than evicting keys that are already being throttled.
 */
@Component
public class SigninAttemptGuard {
  static final int MAX_EMAIL_FAILURES = 5;
  static final int MAX_IP_FAILURES = 20;
  private static final Duration WINDOW = Duration.ofMinutes(15);
  private record Failures(int count, Instant since) {}
  private final Map<String, Failures> failures = new LinkedHashMap<>();
  private final Clock clock;
  private final int capacity;

  public SigninAttemptGuard() {
    this(Clock.systemUTC(), 10_000);
  }

  SigninAttemptGuard(Clock clock, int capacity) {
    if (capacity < 1) throw new IllegalArgumentException("capacity must be positive");
    this.clock = clock;
    this.capacity = capacity;
  }

  public synchronized boolean isBlocked(String email, String ip) {
    purgeExpired();
    return count("email:" + email) >= MAX_EMAIL_FAILURES || count("ip:" + ip) >= MAX_IP_FAILURES;
  }

  public synchronized void recordFailure(String email, String ip) {
    purgeExpired();
    increment("email:" + email);
    increment("ip:" + ip);
  }

  public synchronized void recordSuccess(String email) {
    failures.remove("email:" + email);
  }

  public synchronized void clear() {
    failures.clear();
  }

  private int count(String key) {
    Failures entry = failures.get(key);
    return entry == null ? 0 : entry.count();
  }

  private void increment(String key) {
    Failures entry = failures.get(key);
    if (entry == null && failures.size() >= capacity) return;
    // Re-putting an existing key keeps its insertion position, so the map stays ordered by window start.
    failures.put(key, entry == null ? new Failures(1, clock.instant()) : new Failures(entry.count() + 1, entry.since()));
  }

  private void purgeExpired() {
    Instant now = clock.instant();
    var iterator = failures.values().iterator();
    while (iterator.hasNext()) {
      if (iterator.next().since().plus(WINDOW).isAfter(now)) break;
      iterator.remove();
    }
  }
}
