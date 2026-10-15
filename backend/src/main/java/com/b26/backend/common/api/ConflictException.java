package com.b26.backend.common.api;

import org.springframework.http.HttpStatus;

public class ConflictException extends ApiException {
  public static final String BOARD_CHANGED =
      "This board changed in another tab or session. Your edits have been kept. Cancel editing and reopen the editor to load the latest version.";

  public ConflictException(String message) {
    super(HttpStatus.CONFLICT, message);
  }

  public static ConflictException boardChanged() {
    return new ConflictException(BOARD_CHANGED);
  }
}
