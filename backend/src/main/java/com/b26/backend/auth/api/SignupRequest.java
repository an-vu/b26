package com.b26.backend.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    @NotBlank @Size(min = 2, max = 80) String displayName,
    @NotBlank
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "invalid username format")
        String username) {}
