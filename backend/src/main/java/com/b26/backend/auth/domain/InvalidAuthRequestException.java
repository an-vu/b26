package com.b26.backend.auth.domain;

public class InvalidAuthRequestException extends RuntimeException {
  public InvalidAuthRequestException(String message) {
    super(message);
  }
}
