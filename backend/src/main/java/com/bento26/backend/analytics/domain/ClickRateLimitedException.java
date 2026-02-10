package com.bento26.backend.analytics.domain;

public class ClickRateLimitedException extends RuntimeException {
  public ClickRateLimitedException() {
    super("Too many click events. Try again shortly.");
  }
}
