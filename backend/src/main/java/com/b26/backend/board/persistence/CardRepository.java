package com.b26.backend.board.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CardRepository extends JpaRepository<CardEntity, Long> {
  boolean existsByBoard_IdAndId(String boardId, String id);
}
