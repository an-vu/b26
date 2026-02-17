package com.b26.backend.widget.api;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpsertWidgetRequest(
    @NotBlank(message = "type is required") String type,
    @NotBlank(message = "title is required") String title,
    @NotBlank(message = "layout is required") String layout,
    @NotNull(message = "config is required") JsonNode config,
    @NotNull(message = "enabled is required") Boolean enabled,
    @NotNull(message = "order is required") @Min(value = 0, message = "order must be >= 0") Integer order) {}
