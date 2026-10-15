package com.b26.backend.board.api;

import jakarta.validation.constraints.*;

public record BoardAppearance(
    @NotNull @Pattern(regexp = AppearanceRules.COLOR_MODE) String theme,
    @NotNull @Min(1) @Max(5) Integer radiusStep,
    @NotNull @Pattern(regexp = AppearanceRules.HEX_COLOR) String backgroundColor,
    @NotNull @Pattern(regexp = AppearanceRules.PATTERN) String pattern,
    @Pattern(regexp = AppearanceRules.THEME) String themeFamily,
    @Pattern(regexp = AppearanceRules.INTENSITY) String patternIntensity,
    @Min(1) @Max(3) Integer spacingStep) {
  public BoardAppearance {
    // Legacy theme ids are normalized before validation and persistence.
    themeFamily = AppearanceRules.normalizeThemeFamily(themeFamily);
  }
}
