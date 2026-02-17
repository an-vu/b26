package com.b26.backend.user.api;

public record UserPreferencesDto(
    String userId,
    String username,
    String mainBoardId,
    String mainBoardUrl
) {}
