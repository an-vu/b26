package com.b26.backend.auth.domain;

public class AuthUnauthorizedException extends RuntimeException {
  public AuthUnauthorizedException(String message) {
    super(message);
  }
}
