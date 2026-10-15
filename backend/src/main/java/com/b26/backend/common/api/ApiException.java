package com.b26.backend.common.api;

import org.springframework.http.HttpStatus;

/** Application error rendered by GlobalExceptionHandler with its status and message. */
public class ApiException extends RuntimeException {
  private final HttpStatus status;

  public ApiException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  public HttpStatus status() {
    return status;
  }
}
