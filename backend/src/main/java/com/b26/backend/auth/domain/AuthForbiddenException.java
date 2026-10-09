package com.b26.backend.auth.domain;

public class AuthForbiddenException extends RuntimeException {
  public AuthForbiddenException() {
    super("Forbidden");
  }
}
