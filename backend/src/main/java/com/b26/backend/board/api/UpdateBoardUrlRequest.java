package com.b26.backend.board.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateBoardUrlRequest(
    @NotBlank(message = "boardUrl is required") String boardUrl) {}
