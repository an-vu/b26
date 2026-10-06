package com.b26.backend.board.api;

import com.b26.backend.widget.api.WidgetDto;
import java.util.List;

public record BoardEditDto(BoardDto board, List<WidgetDto> widgets) {}
