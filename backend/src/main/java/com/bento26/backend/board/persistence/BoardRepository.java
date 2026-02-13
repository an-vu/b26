package com.bento26.backend.board.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BoardRepository extends JpaRepository<BoardEntity, String> {
  @Query("select distinct p from BoardEntity p left join fetch p.cards")
  List<BoardEntity> findAllWithCards();
}
