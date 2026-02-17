package com.b26.backend.insights.api;

import jakarta.validation.constraints.NotBlank;

public record RecordClickRequest(@NotBlank(message = "boardId is required") String boardId) {}
