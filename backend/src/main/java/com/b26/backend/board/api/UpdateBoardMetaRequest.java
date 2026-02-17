package com.b26.backend.board.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateBoardMetaRequest(
    @NotBlank(message = "name is required") String name,
    @NotBlank(message = "headline is required") String headline) {}
