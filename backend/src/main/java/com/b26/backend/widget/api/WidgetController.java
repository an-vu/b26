package com.b26.backend.widget.api;

import com.b26.backend.widget.domain.WidgetService;
import com.b26.backend.common.config.ApiAccess;
import static com.b26.backend.common.config.ApiAccess.Policy.*;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Widgets are read here and written only through the versioned board editor. */
@RestController
@RequestMapping("/api/board")
public class WidgetController {
  private final WidgetService widgetService;

  public WidgetController(WidgetService widgetService) {
    this.widgetService = widgetService;
  }

  @GetMapping("/{boardId}/widgets")
  @ApiAccess(BOARD_READ)
  public List<WidgetDto> getWidgets(@PathVariable String boardId) {
    return widgetService.getWidgetsForBoard(boardId);
  }
}
