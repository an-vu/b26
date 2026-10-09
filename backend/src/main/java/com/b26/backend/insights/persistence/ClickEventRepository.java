package com.b26.backend.insights.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClickEventRepository extends JpaRepository<ClickEventEntity, Long> {
  long countByBoardId(String boardId);

  @Query(
      """
      select c.targetId as targetId, count(c) as clickCount
      from ClickEventEntity c
      where c.boardId = :boardId
      group by c.targetId
      order by count(c) desc, c.targetId asc
      """)
  List<TargetClickCountView> countByTargetForBoard(@Param("boardId") String boardId);

  interface TargetClickCountView {
    String getTargetId();

    long getClickCount();
  }
}
