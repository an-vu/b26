package com.b26.backend.user.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Home appearance is independent of the public main board. */
public record HomeAppearanceDto(
    @NotNull @Min(1) @Max(3) Integer radiusStep,
    @NotNull @Min(1) @Max(3) Integer spacingStep,
    @Pattern(regexp = "default|frutiger-aero|aqua|omahakase|kiwi") String themeFamily,
    @Pattern(regexp = "light|dark") String theme,
    @Pattern(regexp = "#[0-9a-fA-F]{6}") String backgroundColor,
    @Pattern(regexp = "none|dots|grid|diagonal|reverse-diagonal|stripes|checkered|rainfall|stars|snow|sakura|wave") String pattern,
    @Pattern(regexp = "light|medium|heavy") String patternIntensity
) {}
