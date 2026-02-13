package com.bento26.backend.analytics.api;

import jakarta.validation.constraints.NotBlank;

public record RecordClickRequest(@NotBlank(message = "boardId is required") String boardId) {}
