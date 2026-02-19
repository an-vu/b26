package com.b26.backend.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SigninRequest(
    @NotBlank @Email String email,
    String password) {}
