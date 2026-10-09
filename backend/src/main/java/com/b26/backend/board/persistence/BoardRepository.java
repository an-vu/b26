package com.b26.backend.board.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BoardRepository extends JpaRepository<BoardEntity, String> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from BoardEntity b where b.boardUrl = :slug")
  Optional<BoardEntity> findForEditing(@org.springframework.data.repository.query.Param("slug") String slug);

  interface PublicBoardRow {
    BoardEntity getBoard();
    com.b26.backend.user.persistence.AppUserEntity getOwner();
  }

  @Query(value = "select b as board, u as owner from BoardEntity b join AppUserEntity u on u.id = b.ownerUserId "
      + "where b.visibility = 'public' order by lower(b.boardName), b.id",
      countQuery = "select count(b) from BoardEntity b where b.visibility = 'public'")
  org.springframework.data.domain.Page<PublicBoardRow> findPublicBoards(org.springframework.data.domain.Pageable pageable);

  boolean existsByBoardUrlAndIdNot(String boardUrl, String id);

  long countByOwnerUserId(String ownerUserId);

  boolean existsByBoardUrl(String boardUrl);
  Optional<BoardEntity> findByBoardUrl(String boardUrl);

  List<BoardEntity> findByOwnerUserIdOrderByUpdatedAtDescBoardNameAsc(String ownerUserId);
}
