package com.bento26.backend.widget.api;

import com.bento26.backend.widget.domain.WidgetService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
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
}
