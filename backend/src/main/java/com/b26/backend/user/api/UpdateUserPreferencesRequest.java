package com.b26.backend.user.api;
/** A null or empty mainBoardId explicitly removes the public main board. */
public record UpdateUserPreferencesRequest(String mainBoardId) {}
