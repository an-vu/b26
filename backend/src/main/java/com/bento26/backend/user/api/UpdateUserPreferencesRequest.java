package com.bento26.backend.user.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserPreferencesRequest(
    @NotBlank(message = "mainBoardId is required") String mainBoardId
) {}
