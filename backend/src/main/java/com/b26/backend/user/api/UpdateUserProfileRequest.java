package com.b26.backend.user.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequest(
    @NotBlank(message = "displayName is required")
    @Size(max = 255, message = "displayName must be at most 255 characters")
    String displayName,
    @NotBlank(message = "username is required")
    @Size(max = 255, message = "username must be at most 255 characters")
    String username,
    @Email(message = "email must be valid")
    @Size(max = 320, message = "email must be at most 320 characters")
    String email
) {}
