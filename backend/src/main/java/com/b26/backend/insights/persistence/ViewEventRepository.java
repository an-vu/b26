package com.b26.backend.insights.persistence;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ViewEventRepository extends JpaRepository<ViewEventEntity, Long> {
  long countByBoardId(String boardId);

  long countByBoardIdAndOccurredAtGreaterThanEqual(String boardId, Instant occurredAt);
}
