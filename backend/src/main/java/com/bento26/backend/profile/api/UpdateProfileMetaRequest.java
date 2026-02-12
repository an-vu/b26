package com.bento26.backend.profile.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileMetaRequest(
    @NotBlank(message = "name is required") String name,
    @NotBlank(message = "headline is required") String headline) {}
