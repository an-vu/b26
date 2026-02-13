package com.bento26.backend.analytics.domain;

import com.bento26.backend.analytics.api.AnalyticsResponse;
import com.bento26.backend.analytics.api.AnalyticsSummaryResponse;
import com.bento26.backend.analytics.api.CardAnalyticsDto;
import com.bento26.backend.analytics.persistence.ClickEventEntity;
import com.bento26.backend.analytics.persistence.ClickEventRepository;
import com.bento26.backend.analytics.persistence.ViewEventEntity;
import com.bento26.backend.analytics.persistence.ViewEventRepository;
import com.bento26.backend.board.domain.BoardNotFoundException;
import com.bento26.backend.board.persistence.CardRepository;
import com.bento26.backend.board.persistence.BoardRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {
  private final ClickEventRepository clickEventRepository;
  private final ViewEventRepository viewEventRepository;
  private final BoardRepository boardRepository;
  private final CardRepository cardRepository;
  private final ClickAbuseGuard clickAbuseGuard;

  public AnalyticsService(
      ClickEventRepository clickEventRepository,
      ViewEventRepository viewEventRepository,
      BoardRepository boardRepository,
      CardRepository cardRepository,
      ClickAbuseGuard clickAbuseGuard) {
    this.clickEventRepository = clickEventRepository;
    this.viewEventRepository = viewEventRepository;
    this.boardRepository = boardRepository;
    this.cardRepository = cardRepository;
    this.clickAbuseGuard = clickAbuseGuard;
  }

  @Transactional
  public void recordClick(String boardId, String cardId, String sourceIp) {
    if (!boardRepository.existsById(boardId)) {
      throw new BoardNotFoundException(boardId);
    }
    if (!cardRepository.existsByBoard_IdAndId(boardId, cardId)) {
      throw new CardNotFoundForBoardException(boardId, cardId);
    }
    if (!clickAbuseGuard.shouldAccept(sourceIp, boardId, cardId)) {
      throw new ClickRateLimitedException();
    }

    ClickEventEntity event = new ClickEventEntity();
    event.setBoardId(boardId);
    event.setCardId(cardId);
    event.setOccurredAt(Instant.now());
    event.setSourceIp(sourceIp);
    clickEventRepository.save(event);
  }

  @Transactional
  public void recordView(String boardId, String sourceIp, String source, String userAgent) {
    if (!boardRepository.existsById(boardId)) {
      throw new BoardNotFoundException(boardId);
    }

    ViewEventEntity event = new ViewEventEntity();
    event.setBoardId(boardId);
    event.setOccurredAt(Instant.now());
    event.setSourceIp(sourceIp);
    event.setSource(normalizeSource(source));
    event.setDeviceType(resolveDeviceType(userAgent));
    viewEventRepository.save(event);
  }

  @Transactional(readOnly = true)
  public AnalyticsResponse getAnalytics(String boardId) {
    if (!boardRepository.existsById(boardId)) {
      throw new BoardNotFoundException(boardId);
    }
    long total = clickEventRepository.countByBoardId(boardId);
    List<CardAnalyticsDto> byCard =
        clickEventRepository.countByCardForBoard(boardId).stream()
            .map(row -> new CardAnalyticsDto(row.getCardId(), row.getClickCount()))
            .toList();
    return new AnalyticsResponse(boardId, total, byCard);
  }

  @Transactional(readOnly = true)
  public AnalyticsSummaryResponse getSummary(String boardId) {
    if (!boardRepository.existsById(boardId)) {
      throw new BoardNotFoundException(boardId);
    }

    Instant now = Instant.now();
    Instant thirtyDaysAgo = now.minusSeconds(30L * 24L * 60L * 60L);
    Instant startOfTodayUtc = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);

    long totalVisits = viewEventRepository.countByBoardId(boardId);
    long visitsLast30Days =
        viewEventRepository.countByBoardIdAndOccurredAtGreaterThanEqual(boardId, thirtyDaysAgo);
    long visitsToday =
        viewEventRepository.countByBoardIdAndOccurredAtGreaterThanEqual(boardId, startOfTodayUtc);
    long totalClicks = clickEventRepository.countByBoardId(boardId);
    List<CardAnalyticsDto> topClickedLinks =
        clickEventRepository.countByCardForBoard(boardId).stream()
            .limit(5)
            .map(row -> new CardAnalyticsDto(row.getCardId(), row.getClickCount()))
            .toList();

    return new AnalyticsSummaryResponse(
        boardId,
        totalVisits,
        visitsLast30Days,
        visitsToday,
        totalClicks,
        topClickedLinks);
  }

  private static String normalizeSource(String source) {
    if (source == null || source.isBlank()) {
      return "direct";
    }
    return source.trim().toLowerCase();
  }

  private static String resolveDeviceType(String userAgent) {
    if (userAgent == null || userAgent.isBlank()) {
      return "unknown";
    }
    String normalized = userAgent.toLowerCase();
    if (normalized.contains("ipad") || normalized.contains("tablet")) {
      return "tablet";
    }
    if (normalized.contains("mobi") || normalized.contains("iphone") || normalized.contains("android")) {
      return "mobile";
    }
    return "desktop";
  }
}
