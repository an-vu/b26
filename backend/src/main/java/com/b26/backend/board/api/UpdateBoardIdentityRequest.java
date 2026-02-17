package com.b26.backend.board.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateBoardIdentityRequest(
    @NotBlank(message = "boardName is required") String boardName,
    @NotBlank(message = "boardUrl is required") String boardUrl) {}
