package com.b26.backend.widget.domain;

public class WidgetNotFoundForBoardException extends RuntimeException {
  public WidgetNotFoundForBoardException(String boardId, long widgetId) {
    super("Widget '" + widgetId + "' not found for board '" + boardId + "'");
  }
}
