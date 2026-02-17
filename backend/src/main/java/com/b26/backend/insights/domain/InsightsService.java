package com.b26.backend.insights.domain;

import com.b26.backend.insights.api.InsightsResponse;
import com.b26.backend.insights.api.InsightsSummaryResponse;
import com.b26.backend.insights.api.CardInsightsDto;
import com.b26.backend.insights.persistence.ClickEventEntity;
import com.b26.backend.insights.persistence.ClickEventRepository;
import com.b26.backend.insights.persistence.ViewEventEntity;
import com.b26.backend.insights.persistence.ViewEventRepository;
import com.b26.backend.board.domain.BoardNotFoundException;
import com.b26.backend.board.persistence.CardRepository;
import com.b26.backend.board.persistence.BoardRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InsightsService {
  private final ClickEventRepository clickEventRepository;
  private final ViewEventRepository viewEventRepository;
  private final BoardRepository boardRepository;
  private final CardRepository cardRepository;
  private final ClickAbuseGuard clickAbuseGuard;

  public InsightsService(
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
  public InsightsResponse getInsights(String boardId) {
    if (!boardRepository.existsById(boardId)) {
      throw new BoardNotFoundException(boardId);
    }
    long total = clickEventRepository.countByBoardId(boardId);
    List<CardInsightsDto> byCard =
        clickEventRepository.countByCardForBoard(boardId).stream()
            .map(row -> new CardInsightsDto(row.getCardId(), row.getClickCount()))
            .toList();
    return new InsightsResponse(boardId, total, byCard);
  }

  @Transactional(readOnly = true)
  public InsightsSummaryResponse getSummary(String boardId) {
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
    List<CardInsightsDto> topClickedLinks =
        clickEventRepository.countByCardForBoard(boardId).stream()
            .limit(5)
            .map(row -> new CardInsightsDto(row.getCardId(), row.getClickCount()))
            .toList();

    return new InsightsSummaryResponse(
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
