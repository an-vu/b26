package com.b26.backend.user.api;

public record UserProfileDto(
    String userId,
    String displayName,
    String username,
    String email
) {}
