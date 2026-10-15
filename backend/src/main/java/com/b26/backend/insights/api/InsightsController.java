package com.b26.backend.insights.api;

import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.insights.domain.InsightsService;
import com.b26.backend.board.domain.BoardAccessService;
import com.b26.backend.common.config.ApiAccess;
import static com.b26.backend.common.config.ApiAccess.Policy.*;
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
  private final BoardAccessService boardAccess;
  private final AuthService authService;

  public InsightsController(InsightsService insightsService, BoardAccessService boardAccess, AuthService authService) {
    this.insightsService = insightsService;
    this.boardAccess = boardAccess;
    this.authService = authService;
  }

  @PostMapping("/insights/widgets/{widgetId}/click")
  @ApiAccess(PUBLIC)
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void recordClick(
      @PathVariable long widgetId,
      @Valid @RequestBody RecordClickRequest request,
      HttpServletRequest servletRequest) {
    String sourceIp = sourceIp(servletRequest);
    // The board ID comes from the validated body, so enforce visibility here before recording.
    requireReadableBoard(request.boardId(), servletRequest);
    insightsService.recordClick(request.boardId(), widgetId, sourceIp);
  }

  @PostMapping("/insights/view")
  @ApiAccess(PUBLIC)
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void recordView(@Valid @RequestBody RecordViewRequest request, HttpServletRequest servletRequest) {
    String sourceIp = sourceIp(servletRequest);
    String userAgent = servletRequest.getHeader("User-Agent");
    // Public admission still requires read access to the board supplied in the body.
    requireReadableBoard(request.boardId(), servletRequest);
    insightsService.recordView(request.boardId(), sourceIp, request.source(), userAgent);
  }

  @GetMapping("/insights/{boardId}/summary")
  @ApiAccess(value = BOARD_OWNER_READ, byId = true)
  public InsightsSummaryResponse getSummary(@PathVariable String boardId) {
    return insightsService.getSummary(boardId);
  }

  // Remote addresses come from X-Forwarded-For via server.forward-headers-strategy=framework.
  private static String sourceIp(HttpServletRequest request) {
    return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
  }

  private void requireReadableBoard(String boardId, HttpServletRequest request) {
    var reader = authService.findAuthenticatedUser(request.getHeader("Authorization")).orElse(null);
    boardAccess.requireRead(boardId, true, false, reader);
  }
}
