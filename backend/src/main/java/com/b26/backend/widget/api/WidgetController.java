package com.b26.backend.widget.api;

import com.b26.backend.widget.domain.WidgetService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/board")
public class WidgetController {
  private final WidgetService widgetService;

  public WidgetController(WidgetService widgetService) {
    this.widgetService = widgetService;
  }

  @GetMapping("/{boardId}/widgets")
  public List<WidgetDto> getWidgets(@PathVariable String boardId) {
    return widgetService.getWidgetsForBoard(boardId);
  }

  @PostMapping("/{boardId}/widgets")
  @ResponseStatus(HttpStatus.CREATED)
  public WidgetDto createWidget(
      @PathVariable String boardId, @Valid @RequestBody UpsertWidgetRequest request) {
    return widgetService.createWidget(boardId, request);
  }

  @PutMapping("/{boardId}/widgets/{widgetId}")
  public WidgetDto updateWidget(
      @PathVariable String boardId,
      @PathVariable long widgetId,
      @Valid @RequestBody UpsertWidgetRequest request) {
    return widgetService.updateWidget(boardId, widgetId, request);
  }

  @DeleteMapping("/{boardId}/widgets/{widgetId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteWidget(@PathVariable String boardId, @PathVariable long widgetId) {
    widgetService.deleteWidget(boardId, widgetId);
  }
}
