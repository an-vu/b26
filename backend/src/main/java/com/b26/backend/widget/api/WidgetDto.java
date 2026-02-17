package com.b26.backend.widget.api;

import com.fasterxml.jackson.databind.JsonNode;

public record WidgetDto(
    long id, String type, String title, String layout, JsonNode config, boolean enabled, int order) {}
