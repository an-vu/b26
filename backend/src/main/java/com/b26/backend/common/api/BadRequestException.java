package com.b26.backend.common.api;

import org.springframework.http.HttpStatus;

/** Rendered as a ValidationErrorResponse whose single error names the rejected field. */
public class BadRequestException extends ApiException {
  private final String field;

  public BadRequestException(String field, String message) {
    super(HttpStatus.BAD_REQUEST, message);
    this.field = field;
  }

  public String field() {
    return field;
  }
}
