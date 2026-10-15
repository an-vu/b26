package com.b26.backend.auth.domain;

import java.time.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SigninAttemptGuardTest {
  static class MutableClock extends Clock {
    final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-01-01T00:00:00Z"));
    public ZoneId getZone() { return ZoneOffset.UTC; }
    public Clock withZone(ZoneId zone) { return this; }
    public Instant instant() { return now.get(); }
  }

  @Test
  void blocksAnEmailAfterRepeatedFailuresUntilTheWindowPasses() {
    var clock = new MutableClock();
    var guard = new SigninAttemptGuard(clock, 100);
    for (int i = 0; i < SigninAttemptGuard.MAX_EMAIL_FAILURES; i++) {
      assertFalse(guard.isBlocked("a@example.com", "ip-" + i));
      guard.recordFailure("a@example.com", "ip-" + i);
    }
    assertTrue(guard.isBlocked("a@example.com", "fresh-ip"));
    assertFalse(guard.isBlocked("b@example.com", "fresh-ip"));
    clock.now.updateAndGet(time -> time.plusSeconds(15 * 60));
    assertFalse(guard.isBlocked("a@example.com", "fresh-ip"));
  }

  @Test
  void blocksAnAddressAcrossEmailsAndSuccessOnlyResetsTheEmail() {
    var guard = new SigninAttemptGuard(new MutableClock(), 100);
    for (int i = 0; i < SigninAttemptGuard.MAX_IP_FAILURES; i++) guard.recordFailure("user" + i + "@example.com", "ip");
    assertTrue(guard.isBlocked("new@example.com", "ip"));
    guard.recordFailure("c@example.com", "other-ip");
    guard.recordSuccess("c@example.com");
    guard.recordSuccess("new@example.com");
    assertTrue(guard.isBlocked("new@example.com", "ip"));
  }

  @Test
  void stopsTrackingNewKeysWhenFullWithoutForgettingThrottledOnes() {
    var guard = new SigninAttemptGuard(new MutableClock(), 2);
    for (int i = 0; i < SigninAttemptGuard.MAX_EMAIL_FAILURES; i++) guard.recordFailure("a@example.com", "ip");
    guard.recordFailure("b@example.com", "ip");
    assertTrue(guard.isBlocked("a@example.com", "other-ip"));
    assertFalse(guard.isBlocked("b@example.com", "other-ip"));
  }
}
