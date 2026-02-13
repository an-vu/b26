package com.bento26.backend.board.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record UpdateBoardRequest(
    @NotBlank(message = "name is required") String name,
    @NotBlank(message = "headline is required") String headline,
    @NotEmpty(message = "cards must not be empty") List<@Valid UpdateCardRequest> cards) {}
