package com.b26.backend.auth.api;

public record AuthUserDto(
    String id,
    String displayName,
    String username,
    String email,
    String role) {}
