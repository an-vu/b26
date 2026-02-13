package com.bento26.backend.analytics.api;

import com.bento26.backend.analytics.domain.AnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AnalyticsController {
  private final AnalyticsService analyticsService;

  public AnalyticsController(AnalyticsService analyticsService) {
    this.analyticsService = analyticsService;
  }

  @PostMapping("/click/{cardId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void recordClick(
      @PathVariable String cardId,
      @Valid @RequestBody RecordClickRequest request,
      HttpServletRequest servletRequest) {
    String sourceIp = servletRequest.getRemoteAddr() == null ? "unknown" : servletRequest.getRemoteAddr();
    analyticsService.recordClick(request.boardId(), cardId, sourceIp);
  }

  @GetMapping("/analytics/{boardId}")
  public AnalyticsResponse getAnalytics(@PathVariable String boardId) {
    return analyticsService.getAnalytics(boardId);
  }
}
