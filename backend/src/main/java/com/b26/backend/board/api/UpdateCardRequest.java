package com.b26.backend.board.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateCardRequest(
    @NotBlank(message = "id is required") String id,
    @NotBlank(message = "label is required") String label,
    @NotBlank(message = "href is required") String href) {}
