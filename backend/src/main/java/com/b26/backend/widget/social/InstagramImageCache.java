package com.b26.backend.widget.social;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Semaphore;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Bounded, short-lived media cache. Controllers must authorize the board before every lookup. */
@Service
public class InstagramImageCache {
  @FunctionalInterface interface Loader { byte[] load(String url) throws Exception; }
  private record Entry(byte[] bytes, Instant expires) {}
  private static final Duration TTL = Duration.ofMinutes(5);
  private final LinkedHashMap<String, Entry> cache = new LinkedHashMap<>(16, .75f, true);
  private final ConcurrentHashMap<String, CompletableFuture<byte[]>> pending = new ConcurrentHashMap<>();
  private final Semaphore slots = new Semaphore(4);
  private final Clock clock;
  private final Loader loader;
  private final int byteLimit;
  private int cachedBytes;

  public InstagramImageCache() { this(Clock.systemUTC(), InstagramProvider::image, 16 * 1024 * 1024); }
  InstagramImageCache(Clock clock, Loader loader, int byteLimit) {
    this.clock = clock; this.loader = loader; this.byteLimit = byteLimit;
  }

  private byte[] findFresh(String url) {
    synchronized (cache) {
      Entry entry = cache.get(url);
      if (entry != null && entry.expires().isAfter(clock.instant())) return entry.bytes();
      if (entry != null) { cachedBytes -= entry.bytes().length; cache.remove(url); }
      return null;
    }
  }

  public byte[] get(String url) throws Exception {
    byte[] cached = findFresh(url);
    if (cached != null) return cached;
    var result = new CompletableFuture<byte[]>();
    var existing = pending.putIfAbsent(url, result);
    if (existing != null) {
      try { return existing.get(); }
      catch (ExecutionException error) {
        if (error.getCause() instanceof Exception cause) throw cause;
        throw error;
      }
    }
    boolean acquired = slots.tryAcquire();
    try {
      if (!acquired) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
      // A previous flight may have finished between our initial lookup and registration.
      cached = findFresh(url);
      if (cached != null) { result.complete(cached); return cached; }
      byte[] bytes = loader.load(url);
      synchronized (cache) {
        // Signed image URLs are keys; never retain more than the byte or entry budget.
        var iterator = cache.entrySet().iterator();
        while (iterator.hasNext()) {
          var entry = iterator.next().getValue();
          if (!entry.expires().isAfter(clock.instant())) { cachedBytes -= entry.bytes().length; iterator.remove(); }
        }
        if (bytes.length <= byteLimit) {
          while (!cache.isEmpty() && (cachedBytes + bytes.length > byteLimit || cache.size() >= 64)) {
            var oldest = cache.entrySet().iterator();
            cachedBytes -= oldest.next().getValue().bytes().length; oldest.remove();
          }
          cache.put(url, new Entry(bytes, clock.instant().plus(TTL)));
          cachedBytes += bytes.length;
        }
      }
      result.complete(bytes);
      return bytes;
    } catch (Exception error) {
      result.completeExceptionally(error);
      throw error;
    } finally {
      pending.remove(url, result);
      if (acquired) slots.release();
    }
  }
}
