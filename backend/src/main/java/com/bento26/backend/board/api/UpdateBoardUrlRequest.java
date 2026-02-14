package com.bento26.backend.board.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateBoardUrlRequest(
    @NotBlank(message = "boardUrl is required") String boardUrl) {}
