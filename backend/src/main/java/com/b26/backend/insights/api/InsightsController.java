package com.b26.backend.insights.api;

import com.b26.backend.insights.domain.InsightsService;
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
public class InsightsController {
  private final InsightsService insightsService;

  public InsightsController(InsightsService insightsService) {
    this.insightsService = insightsService;
  }

  @PostMapping("/click/{cardId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void recordClick(
      @PathVariable String cardId,
      @Valid @RequestBody RecordClickRequest request,
      HttpServletRequest servletRequest) {
    String sourceIp = servletRequest.getRemoteAddr() == null ? "unknown" : servletRequest.getRemoteAddr();
    insightsService.recordClick(request.boardId(), cardId, sourceIp);
  }

  @GetMapping("/insights/{boardId}")
  public InsightsResponse getInsights(@PathVariable String boardId) {
    return insightsService.getInsights(boardId);
  }

  @PostMapping("/insights/view")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void recordView(@Valid @RequestBody RecordViewRequest request, HttpServletRequest servletRequest) {
    String sourceIp = servletRequest.getRemoteAddr() == null ? "unknown" : servletRequest.getRemoteAddr();
    String userAgent = servletRequest.getHeader("User-Agent");
    insightsService.recordView(request.boardId(), sourceIp, request.source(), userAgent);
  }

  @GetMapping("/insights/{boardId}/summary")
  public InsightsSummaryResponse getSummary(@PathVariable String boardId) {
    return insightsService.getSummary(boardId);
  }
}
