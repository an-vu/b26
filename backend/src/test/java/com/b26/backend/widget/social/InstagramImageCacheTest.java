package com.b26.backend.widget.social;

import java.time.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class InstagramImageCacheTest {
  private static class TestClock extends Clock {
    Instant now = Instant.parse("2026-10-14T00:00:00Z");
    public ZoneId getZone() { return ZoneOffset.UTC; }
    public Clock withZone(ZoneId zone) { return this; }
    public Instant instant() { return now; }
  }

  @Test void reusesPhotosAndRefreshesAfterExpiry() throws Exception {
    var clock = new TestClock(); var calls = new AtomicInteger();
    var cache = new InstagramImageCache(clock, url -> new byte[]{(byte) calls.incrementAndGet()}, 10);
    assertEquals(1, cache.get("photo")[0]);
    assertEquals(1, cache.get("photo")[0]);
    clock.now = clock.now.plusSeconds(301);
    assertEquals(2, cache.get("photo")[0]);
  }

  @Test void evictsLeastRecentlyUsedPhotosWithinByteBudget() throws Exception {
    var calls = new AtomicInteger();
    var cache = new InstagramImageCache(new TestClock(), url -> { calls.incrementAndGet(); return new byte[4]; }, 8);
    cache.get("a"); cache.get("b"); cache.get("a"); cache.get("c"); cache.get("a");
    assertEquals(3, calls.get());
    cache.get("b"); assertEquals(4, calls.get());
  }

  @Test void doesNotCacheOversizedImagesOrFailedFetches() throws Exception {
    var calls = new AtomicInteger();
    var cache = new InstagramImageCache(new TestClock(), url -> {
      if (calls.incrementAndGet() == 1) throw new IllegalStateException("unavailable");
      return new byte[11];
    }, 10);
    assertThrows(IllegalStateException.class, () -> cache.get("photo"));
    cache.get("photo"); cache.get("photo"); assertEquals(3, calls.get());
  }

  @Test void coalescesConcurrentFetchesForTheSamePhoto() throws Exception {
    var started = new CountDownLatch(1); var release = new CountDownLatch(1); var calls = new AtomicInteger();
    var cache = new InstagramImageCache(new TestClock(), url -> {
      calls.incrementAndGet(); started.countDown();
      assertTrue(release.await(5, TimeUnit.SECONDS)); return new byte[]{1};
    }, 10);
    try (var pool = Executors.newFixedThreadPool(2)) {
      var first = pool.submit(() -> cache.get("photo"));
      assertTrue(started.await(5, TimeUnit.SECONDS));
      var second = pool.submit(() -> cache.get("photo"));
      release.countDown();
      assertArrayEquals(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS));
      assertEquals(1, calls.get());
    } finally { release.countDown(); }
  }
}
