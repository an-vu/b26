package com.bento26.backend.profile.domain;

public class InvalidProfileUpdateException extends RuntimeException {
  public InvalidProfileUpdateException(String message) {
    super(message);
  }
}
