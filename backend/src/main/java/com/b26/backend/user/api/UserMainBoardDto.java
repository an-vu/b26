package com.b26.backend.user.api;

public record UserMainBoardDto(
    String userId,
    String username,
    String mainBoardId,
    String mainBoardUrl
) {}
