package com.bento26.backend.analytics.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClickEventRepository extends JpaRepository<ClickEventEntity, Long> {
  long countByProfileId(String profileId);

  @Query(
      """
      select c.cardId as cardId, count(c) as clickCount
      from ClickEventEntity c
      where c.profileId = :profileId
      group by c.cardId
      order by count(c) desc, c.cardId asc
      """)
  List<CardClickCountView> countByCardForProfile(@Param("profileId") String profileId);

  interface CardClickCountView {
    String getCardId();

    long getClickCount();
  }
}
