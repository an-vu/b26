package com.b26.backend.insights.api;

import jakarta.validation.constraints.NotBlank;

public record RecordViewRequest(
    @NotBlank(message = "boardId is required") String boardId, String source) {}
