package com.b26.backend.board.api;

import jakarta.validation.constraints.*;

public record BoardAppearance(
    @NotNull @Pattern(regexp = "light|dark") String theme,
    @NotNull @Min(1) @Max(3) Integer radiusStep,
    @NotNull @Pattern(regexp = "#[0-9a-fA-F]{6}") String backgroundColor,
    @NotNull @Pattern(regexp = "none|dots|grid|diagonal|reverse-diagonal|stripes|checkered|rainfall|stars|snow|sakura|wave") String pattern,
    @Pattern(regexp = "default|frutiger-aero|aqua|omahakase|kiwi") String themeFamily,
    @Pattern(regexp = "light|medium|heavy") String patternIntensity,
    @Min(1) @Max(3) Integer spacingStep) {}
