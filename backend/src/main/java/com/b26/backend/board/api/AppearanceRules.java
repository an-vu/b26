package com.b26.backend.board.api;

import java.util.Map;

/** Shared API validation vocabulary for board and Home appearance. */
public final class AppearanceRules {
  private AppearanceRules() {}
  public static final String COLOR_MODE = "light|dark";
  public static final String HEX_COLOR = "#[0-9a-fA-F]{6}";
  public static final String PATTERN = "none|dots|grid|diagonal|reverse-diagonal|stripes|checkered|rainfall|stars|snow|sakura|wave|lava|bokeh";
  public static final String THEME = "berry|aero|aqua|omakase|kiwi|valencia";
  public static final String INTENSITY = "light|medium|heavy";

  /** Theme ids renamed in V42; old browser tabs may still send them. */
  private static final Map<String, String> LEGACY_THEME_ALIASES = Map.of(
      "default", "berry",
      "frutiger-aero", "aero",
      "omahakase", "omakase",
      "lofi", "valencia");

  /** Maps a legacy theme family id to its current id; other values (including null) pass through. */
  public static String normalizeThemeFamily(String themeFamily) {
    return themeFamily == null ? null : LEGACY_THEME_ALIASES.getOrDefault(themeFamily, themeFamily);
  }
}
