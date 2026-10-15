package com.b26.backend.common.api;

import org.springframework.http.HttpStatus;

public class NotFoundException extends ApiException {
  public NotFoundException(String message) {
    super(HttpStatus.NOT_FOUND, message);
  }

  public static NotFoundException board(String key) {
    return new NotFoundException("Board not found: " + key);
  }

  public static NotFoundException user(String key) {
    return new NotFoundException("User not found: " + key);
  }

  public static NotFoundException widget(String boardId, long widgetId) {
    return new NotFoundException("Widget '" + widgetId + "' not found for board '" + boardId + "'");
  }
}
