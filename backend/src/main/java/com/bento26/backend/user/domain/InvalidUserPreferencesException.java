package com.bento26.backend.user.domain;

public class InvalidUserPreferencesException extends RuntimeException {
  public InvalidUserPreferencesException(String message) {
    super(message);
  }
}
