package com.b26.backend.user.domain;

public class InvalidUserProfileException extends RuntimeException {
  public InvalidUserProfileException(String message) {
    super(message);
  }
}
