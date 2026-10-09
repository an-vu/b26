package com.b26.backend.board.api;

import java.util.List;

public record BoardPageDto(List<BoardDto> items, int page, int size, long totalElements, int totalPages) {}
