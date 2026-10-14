package com.b26.backend.user.api;

import com.b26.backend.board.api.AppearanceRules;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Home appearance is independent of the public main board. */
public record HomeAppearanceDto(
    @NotNull @Min(1) @Max(5) Integer radiusStep,
    @NotNull @Min(1) @Max(3) Integer spacingStep,
    @Pattern(regexp = AppearanceRules.THEME) String themeFamily,
    @Pattern(regexp = AppearanceRules.COLOR_MODE) String theme,
    @Pattern(regexp = AppearanceRules.HEX_COLOR) String backgroundColor,
    @Pattern(regexp = AppearanceRules.PATTERN) String pattern,
    @Pattern(regexp = AppearanceRules.INTENSITY) String patternIntensity
) {}
