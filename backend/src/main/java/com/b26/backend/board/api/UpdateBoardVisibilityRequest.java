package com.b26.backend.board.api;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
public record UpdateBoardVisibilityRequest(
    @NotNull @Pattern(regexp = "public|private") String visibility,
    @NotNull Long version) {}
