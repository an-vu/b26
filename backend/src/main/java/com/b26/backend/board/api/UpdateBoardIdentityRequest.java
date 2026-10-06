package com.b26.backend.board.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateBoardIdentityRequest(
    @NotBlank(message = "boardName is required") @jakarta.validation.constraints.Size(max = 255) String boardName,
    @NotBlank(message = "boardUrl is required") @jakarta.validation.constraints.Size(max = 255) String boardUrl,
    @jakarta.validation.constraints.Min(0) Long version) {}
