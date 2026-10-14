package com.b26.backend.board.api;

/** Shared API validation vocabulary for board and Home appearance. */
public final class AppearanceRules {
  private AppearanceRules() {}
  public static final String COLOR_MODE = "light|dark";
  public static final String HEX_COLOR = "#[0-9a-fA-F]{6}";
  public static final String PATTERN = "none|dots|grid|diagonal|reverse-diagonal|stripes|checkered|rainfall|stars|snow|sakura|wave|lava|bokeh";
  public static final String THEME = "default|frutiger-aero|aqua|omahakase|kiwi|lofi";
  public static final String INTENSITY = "light|medium|heavy";
}
