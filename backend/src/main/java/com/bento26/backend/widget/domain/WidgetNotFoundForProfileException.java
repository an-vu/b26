package com.bento26.backend.widget.domain;

public class WidgetNotFoundForProfileException extends RuntimeException {
  public WidgetNotFoundForProfileException(String profileId, long widgetId) {
    super("Widget '" + widgetId + "' not found for profile '" + profileId + "'");
  }
}
