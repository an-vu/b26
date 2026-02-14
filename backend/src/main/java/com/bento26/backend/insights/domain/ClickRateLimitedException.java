package com.bento26.backend.insights.domain;

public class ClickRateLimitedException extends RuntimeException {
  public ClickRateLimitedException() {
    super("Too many click events. Try again shortly.");
  }
}
