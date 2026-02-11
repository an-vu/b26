package com.bento26.backend.widget.api;

import com.bento26.backend.widget.domain.WidgetService;
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
@RequestMapping("/api/profile")
public class WidgetController {
  private final WidgetService widgetService;

  public WidgetController(WidgetService widgetService) {
    this.widgetService = widgetService;
  }

  @GetMapping("/{profileId}/widgets")
  public List<WidgetDto> getWidgets(@PathVariable String profileId) {
    return widgetService.getWidgetsForProfile(profileId);
  }

  @PostMapping("/{profileId}/widgets")
  @ResponseStatus(HttpStatus.CREATED)
  public WidgetDto createWidget(
      @PathVariable String profileId, @Valid @RequestBody UpsertWidgetRequest request) {
    return widgetService.createWidget(profileId, request);
  }

  @PutMapping("/{profileId}/widgets/{widgetId}")
  public WidgetDto updateWidget(
      @PathVariable String profileId,
      @PathVariable long widgetId,
      @Valid @RequestBody UpsertWidgetRequest request) {
    return widgetService.updateWidget(profileId, widgetId, request);
  }

  @DeleteMapping("/{profileId}/widgets/{widgetId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteWidget(@PathVariable String profileId, @PathVariable long widgetId) {
    widgetService.deleteWidget(profileId, widgetId);
  }
}
