package com.bento26.backend.analytics.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClickEventRepository extends JpaRepository<ClickEventEntity, Long> {
  long countByBoardId(String boardId);

  @Query(
      """
      select c.cardId as cardId, count(c) as clickCount
      from ClickEventEntity c
      where c.boardId = :boardId
      group by c.cardId
      order by count(c) desc, c.cardId asc
      """)
  List<CardClickCountView> countByCardForBoard(@Param("boardId") String boardId);

  interface CardClickCountView {
    String getCardId();

    long getClickCount();
  }
}
