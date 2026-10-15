package com.b26.backend.common.api;

import org.springframework.http.HttpStatus;

/** 401 for missing or invalid credentials, 403 for an authenticated caller without permission. */
public class AuthException extends ApiException {
  private AuthException(HttpStatus status, String message) {
    super(status, message);
  }

  public static AuthException unauthorized(String message) {
    return new AuthException(HttpStatus.UNAUTHORIZED, message);
  }

  public static AuthException forbidden() {
    return new AuthException(HttpStatus.FORBIDDEN, "Forbidden");
  }
}
