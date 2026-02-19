package com.b26.backend.auth.api;

import java.time.Instant;

public record AuthSessionResponse(
    String accessToken,
    Instant expiresAt,
    AuthUserDto user) {}
