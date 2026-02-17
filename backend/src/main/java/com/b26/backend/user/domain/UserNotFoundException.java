package com.b26.backend.user.domain;

public class UserNotFoundException extends RuntimeException {
  public UserNotFoundException(String userIdOrUsername) {
    super("User not found: " + userIdOrUsername);
  }
}
