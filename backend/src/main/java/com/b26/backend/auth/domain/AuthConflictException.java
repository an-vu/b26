package com.b26.backend.auth.domain;

public class AuthConflictException extends RuntimeException {
  public AuthConflictException(String message) {
    super(message);
  }
}
