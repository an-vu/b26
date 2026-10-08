package com.b26.backend.board.api;

public record BoardDto(
    String id, String boardName, String boardUrl, String name, String headline,
    Long version, String ownerUsername, BoardAppearance appearance,
    String ownerDisplayName, String website, String visibility) {}
