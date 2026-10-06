package com.b26.backend.board.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BoardRepository extends JpaRepository<BoardEntity, String> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from BoardEntity b where b.boardUrl = :slug")
  Optional<BoardEntity> findForEditing(@org.springframework.data.repository.query.Param("slug") String slug);

  @Query("select distinct p from BoardEntity p left join fetch p.cards")
  List<BoardEntity> findAllWithCards();

  boolean existsByBoardUrlAndIdNot(String boardUrl, String id);


  boolean existsByBoardUrl(String boardUrl);
  Optional<BoardEntity> findByBoardUrl(String boardUrl);

  Optional<BoardEntity> findFirstByOwnerUserIdOrderByBoardNameAsc(String ownerUserId);

  List<BoardEntity> findByOwnerUserIdOrderByUpdatedAtDescBoardNameAsc(String ownerUserId);
}
