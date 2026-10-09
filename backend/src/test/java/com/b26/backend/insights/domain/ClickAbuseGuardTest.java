package com.b26.backend.insights.domain;

import java.time.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ClickAbuseGuardTest {
  static class MutableClock extends Clock {
    final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-01-01T00:00:00Z"));
    public ZoneId getZone() { return ZoneOffset.UTC; }
    public Clock withZone(ZoneId zone) { return this; }
    public Instant instant() { return now.get(); }
  }

  @Test
  void expiresEntriesAndBoundsCapacityWithoutEvictingActiveKeys() {
    var clock = new MutableClock();
    var guard = new ClickAbuseGuard(clock, 2);
    assertTrue(guard.shouldAccept("ip", "board", "one"));
    assertTrue(guard.shouldAccept("ip", "board", "two"));
    assertFalse(guard.shouldAccept("ip", "board", "three"));
    assertFalse(guard.shouldAccept("ip", "board", "one"));
    clock.now.updateAndGet(time -> time.plusSeconds(2));
    assertTrue(guard.shouldAccept("ip", "board", "three"));
    assertTrue(guard.shouldAccept("ip", "board", "one"));
  }

  @Test
  void concurrentRequestsForTheSameTargetAcceptExactlyOne() throws Exception {
    var guard = new ClickAbuseGuard(new MutableClock(), 100);
    var start = new CountDownLatch(1);
    try (var executor = Executors.newFixedThreadPool(16)) {
      var futures = new java.util.ArrayList<Future<Boolean>>();
      for (int i = 0; i < 32; i++) {
        futures.add(executor.submit(() -> {
          start.await();
          return guard.shouldAccept("ip", "board", "target");
        }));
      }
      start.countDown();
      int accepted = 0;
      for (var future : futures) if (future.get(5, TimeUnit.SECONDS)) accepted++;
      assertEquals(1, accepted);
    }
  }

  @Test
  void keyPartsCannotCollideAndBoardsRemainIndependent() {
    var guard = new ClickAbuseGuard(new MutableClock(), 10);
    assertTrue(guard.shouldAccept("ip|board", "a", "target"));
    assertTrue(guard.shouldAccept("ip", "board|a", "target"));
    assertTrue(guard.shouldAccept("ip", "other", "target"));
  }
}
