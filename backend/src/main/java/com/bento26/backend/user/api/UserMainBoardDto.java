package com.bento26.backend.user.api;

public record UserMainBoardDto(
    String userId,
    String username,
    String mainBoardId,
    String mainBoardUrl
) {}
