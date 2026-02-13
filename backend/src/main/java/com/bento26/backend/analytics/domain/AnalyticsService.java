package com.bento26.backend.analytics.domain;

import com.bento26.backend.analytics.api.AnalyticsResponse;
import com.bento26.backend.analytics.api.CardAnalyticsDto;
import com.bento26.backend.analytics.persistence.ClickEventEntity;
import com.bento26.backend.analytics.persistence.ClickEventRepository;
import com.bento26.backend.board.domain.BoardNotFoundException;
import com.bento26.backend.board.persistence.CardRepository;
import com.bento26.backend.board.persistence.BoardRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {
  private final ClickEventRepository clickEventRepository;
  private final BoardRepository boardRepository;
  private final CardRepository cardRepository;
  private final ClickAbuseGuard clickAbuseGuard;

  public AnalyticsService(
      ClickEventRepository clickEventRepository,
      BoardRepository boardRepository,
      CardRepository cardRepository,
      ClickAbuseGuard clickAbuseGuard) {
    this.clickEventRepository = clickEventRepository;
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
}
